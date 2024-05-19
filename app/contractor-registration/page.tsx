'use client';
import { Offline, Online } from "react-detect-offline";
import { Button, Checkbox, Label, TextInput, Badge, Card, Select, Avatar, FileInput, Alert } from 'flowbite-react';
import Link from 'next/link';
import { HiTrash, HiInformationCircle } from 'react-icons/hi';
import { NetworkMessage, NetworkTitle, customCheckboxTheme, customInputBoxTheme, customselectTheme, customsubmitTheme } from '../customTheme/appTheme';
import { useFetchProvinces, useFetchServices } from "../_hooks/useFetch";
import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { v4 } from "uuid";
import { db, storage } from '../DB/firebaseConnection';
import { failureMessage, successMessage } from '../notifications/successError';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import moment from 'moment';
import ReCAPTCHA from 'react-google-recaptcha';

const ContractorRegistration = () => {
    const { ProvinceData, DataError, isLoading } = useFetchProvinces();
    const { ServiceData, serviceError, isLoadingservies } = useFetchServices();
    const [avatarImage, setAvatarImage] = useState<any>(null);
    const [Imageupload, setImageupload] = useState<File | null>(null);
    const [Certificate, setCertificate] = useState<File | null>(null);
    let image_url: string;
    image_url = "";
    let pdf_url: string;
    pdf_url = "";
    const router = useRouter();
    const [companyName, setcompanyName] = useState<string>("");
    const [companyEmail, setcompanyEmail] = useState<string>("");
    const [companypassword, setcompanypassword] = useState<string>("");
    const [Address, setAddress] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [tncs, setTnCs] = useState<boolean>(false);
    const [formType, setformType] = useState<boolean>(false);
    const [RegistrationNo, setRegistrationNo] = useState("");
    const [isprocessing, Setprocessing] = useState<boolean>(false);
    const [Visibility, setVisibility] = useState<boolean>(true);
    const [YourName, SetYourName] = useState<string>("");
    const [YourSurName, SetYourSurName] = useState<string>("");
    const [YourID, SetYourID] = useState<string>("");
    var imgfilename: string;
    var pdffilename: string;
    imgfilename = "";
    pdffilename = "";
    let responseMessage: string;
    const setResponseMessage = (msg: any) => responseMessage = msg;
    const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
    const [selectedServices, SetSelectedServices] = useState<string[]>([]);

    const AppendSelectedServices = useCallback((value: string) => {
        if (!selectedServices.includes(value) && selectedServices.length < 15) {
            const updatedSelectedServices = [...selectedServices, value];
            SetSelectedServices(updatedSelectedServices);
        }
    }, [selectedServices, SetSelectedServices]);
    const handleRecaptchaChange = (token: string | null) => {
        setRecaptchaToken(token);
    };
    const RemoveServices = (value: string) => {
        const updatedServices = selectedServices.filter((item) => item !== value);
        SetSelectedServices(updatedServices);
    }
    const fileInputRef = useRef<any>(null);

    const handleImageChange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
            // Check if the selected file is an image and is not gif
            if (!file.type.startsWith('image/') || file.type === 'image/gif') {
                alert('Please select a non-GIF image file.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event: any) => {
                // Set the image source to the selected file
                const imageDataUrl = event.target.result;
                setAvatarImage(imageDataUrl);
                setImageupload(file);
            };
            reader.readAsDataURL(file);
        }
    };

    const OpenImagePicker = () => {
        // Open the file picker by clicking the hidden file input
        fileInputRef.current.click();
    };

    useEffect(() => {
        if (ProvinceData && ProvinceData.length > 0) {
            const firstTown = ProvinceData[0]?.Towns[0]?.area;
            setAddress(firstTown);
        }
        if (ServiceData && ServiceData.length > 0) {
            const firstService = ServiceData[0]?.actualTask[0]?.task;
            AppendSelectedServices(firstService);
        }
    }, [ProvinceData, ServiceData]);

    const RegisterMember = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        Setprocessing(true);
        if (formType) {
            await uploadProfileImage();
            if (image_url !== null && image_url?.includes("http")) {
                if (formType) {
                    if (IsErrorSkilled()) return;
                    AddFirestoreData();
                } else if (!formType) {
                    if (IsErrorContractor()) return;
                    AddFirestoreData();
                }

            } else {
                Setprocessing(false);
                failureMessage("Opps... we had an issue while uploading your media files. (Try again)");
            }
        } else if (!formType) {
            await uploadProfileImage();
            await uploadCertificate();
            if (image_url !== null && image_url?.includes("http") && pdf_url !== null && pdf_url?.includes("http")) {
                if (formType) {
                    if (IsErrorSkilled()) return;
                    AddFirestoreData();
                } else if (!formType) {
                    if (IsErrorContractor()) return;
                    AddFirestoreData();
                }

            } else {
                Setprocessing(false);
                failureMessage("Opps... we had an issue while uploading your media files. (Try again)");
            }
        }


    }

    const IsErrorContractor = () => {
        let found: Boolean;
        found = false;
        if (companyName == "" || companyEmail == "" || RegistrationNo == "" || YourName == "" ||
            phone == "" || Address == "" || image_url == "" || pdf_url == "" || imgfilename == "" || pdffilename == "") {
            found = true;
            Setprocessing(false);
            failureMessage("Please correct your form entry.");
        }
        if (selectedServices.length == 0) {
            found = true;
            Setprocessing(false);
            failureMessage("Please select at lest one or more service(s).");
        }
        if (!tncs) {
            found = true;
            Setprocessing(false);
            failureMessage("Please agree to the terms and conditions.");
        };
        return found;
    }

    const IsErrorSkilled = () => {
        let found: Boolean;
        found = false;
        if (companyEmail == "" || YourSurName == "" || YourName == "" ||
            phone == "" || Address == "" || image_url == "" || imgfilename == "" || YourID == "") {
            found = true;
            Setprocessing(false);
            failureMessage("Please correct your form entry.");
        }
        if (selectedServices.length == 0) {
            found = true;
            Setprocessing(false);
            failureMessage("Please select at lest one or more service(s).");
        }
        if (!tncs) {
            found = true;
            Setprocessing(false);
            failureMessage("Please agree to the terms and conditions.");
        };
        return found;
    }

    const VisibileRegisterButton = () => {
        cleanUp();
        setVisibility(true);
        router.replace('login');
    }

    const cleanUp = () => {
        setcompanyName("");
        setcompanyEmail("");
        setPhone("");
        setAddress("");
        SetYourID("");
        SetYourName("");
        SetYourSurName("");
        setRegistrationNo("");
        setformType(false);
        image_url = "";
        pdf_url = "";
        imgfilename = "";
        pdffilename = "",
            setTnCs(false);
    }

    const AddFirestoreData = async () => {

        try {
            const response = await fetch('http://localhost:4000/verify-recaptcha/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: recaptchaToken }),
            });

            const data = await response.json();
            setResponseMessage(data.message);

            if (data.message == "reCAPTCHA verification successful" && data.success == true) {
                try {
                    const auth = getAuth();
                    const profileData = {
                        companyName,
                        companyEmail: companyEmail.toLowerCase(),
                        phone,
                        Address,
                        YourName,
                        YourSurName,
                        RegistrationNo,
                        YourID,
                        formSubmitted: formType ? "Skilled Individual" : "Registered Company",
                        AdvertisingMsg: "",//to be updated in their profile
                        profileImage: image_url,
                        certificate: pdf_url,
                        imgfilename,
                        pdffilename,
                        isactive: "no",
                        membership: "contractor",
                        Services: selectedServices,
                        tncs: tncs ? "agreed" : "not agreed but registered",
                        TimeRegistered: moment().format('MMMM Do YYYY, h:mm a')
                    }
                    const BidCredits = {
                        credit: 1, //one free Bidding credit for new contractor members only.
                        CreditType: "free",
                        tokens: []
                    }
                    let resp = await createUserWithEmailAndPassword(auth, companyEmail.trim(), companypassword);
                    if (resp?.user?.uid !== undefined && resp?.user?.uid !== null) {
                        setDoc(doc(db, 'Users', resp?.user?.uid.trim()), profileData).then(async () => {
                            await setDoc(doc(db, 'BidCredits', resp?.user?.uid.trim()), BidCredits);
                            Setprocessing(false);
                            successMessage("Sucessfully registered\nYou may add or update your Bio message after login in.");
                            setVisibility(false);
                            setTimeout(VisibileRegisterButton, 4000);
                        }).catch((err: any) => {
                            Setprocessing(false);
                            failureMessage(err?.message);
                        });
                    }
                } catch (error: any) {
                    failureMessage(error?.message);
                    Setprocessing(false);
                }
            } else {
                Setprocessing(false);
                failureMessage(responseMessage);
            }
        } catch (error) {
            Setprocessing(false);
            console.error('Error submitting reCAPTCHA token:', error);
            setResponseMessage('Error submitting reCAPTCHA token');
            failureMessage("Error submitting reCAPTCHA token");
        }
    }

    const uploadProfileImage = async () => {
        if (Imageupload == null) return;
        imgfilename = Imageupload?.name + v4();
        var filepath = `ProfileImages/${imgfilename}`;
        const imageRef = ref(storage, filepath);
        try {
            await uploadBytes(imageRef, Imageupload);
            image_url = await getDownloadURL(ref(storage, filepath));
        } catch (err: any) {
            failureMessage(err?.message);
        }
    }

    const uploadCertificate = async () => {
        if (Certificate == null) return;
        pdffilename = Certificate?.name + v4();
        var filepath = `Certificates/${pdffilename}`;
        const pdfRef = ref(storage, filepath);
        try {
            await uploadBytes(pdfRef, Certificate);
            pdf_url = await getDownloadURL(ref(storage, filepath));
        } catch (err: any) {
            failureMessage(err?.message);
        }
    }

    return (
        <div className="w-full gap-4">
            <div className="h-full flex justify-center bg-opacity-75 bg-black">
                <Card className='flex max-w-lg flex-grow rounded top-0 mt-20 mb-3 ml-1 mr-1'>
                    <form onSubmit={(e) => RegisterMember(e)} className="flex max-w-lg flex-col gap-4 flex-grow">
                        <div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleImageChange}
                            />
                            <Avatar size={"lg"} className='hover:cursor-pointer' onClick={OpenImagePicker} img={avatarImage == null ? "" : avatarImage}>
                                <div className="space-y-1 font-medium dark:text-white">
                                    <div>{formType ? "Your Head-Shot image" : "Company logo"}</div>
                                </div>
                            </Avatar>
                        </div>
                        <p className="text-xs text-black">Are you a bussiness owner or just a skilled individual Toogle the button below for skilled individual.</p>

                        <label className="inline-flex items-center me-5 cursor-pointer">
                            <span className="me-3 text-sm font-medium text-gray-900 dark:text-gray-300">Bussiness Owner</span>
                            <input type="checkbox" className="sr-only peer mr-2" checked={formType} onChange={() => setformType(formType ? false : true)} />
                            <div className="relative w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-appGreen dark:peer-focus:ring-appGreen peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-appGreen"></div>
                            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">Skilled Individual</span>
                        </label>

                        {formType ?
                            <>
                                <div>
                                    <div className="mb-2 block">
                                        <Label htmlFor="Town" value={formType ? "Name *" : "Company Representative"} />
                                    </div>
                                    <TextInput
                                        value={YourName}
                                        onChange={(e) => SetYourName(e.target.value)}
                                        theme={customInputBoxTheme} color={"focuscolor"} id="cmpName" type="text" placeholder={formType ? "Your Name" : "Company Representative"} required shadow />
                                </div>
                                <div>
                                    <div className="mb-2 block">
                                        <Label htmlFor="Town" value="Surname *" />
                                    </div>
                                    <TextInput
                                        value={YourSurName}
                                        onChange={(e) => SetYourSurName(e.target.value)}
                                        theme={customInputBoxTheme} color={"focuscolor"} id="cmpName" type="text" placeholder="Your Surname" required shadow />
                                </div>

                                <div>
                                    <div className="mb-2 block">
                                        <Label htmlFor="idnum" value="ID Number *" />
                                    </div>
                                    <TextInput
                                        value={YourID}
                                        onChange={(e) => SetYourID(e.target.value)}
                                        theme={customInputBoxTheme} color={"focuscolor"} id="idnum" type="tel" placeholder={formType ? "Your ID no." : "Representative ID no."} maxLength={13} required shadow />
                                </div>

                                <div>
                                    <div className="mb-2 block">
                                        <Label htmlFor="Town" value={formType ? "Your Email" : "Company Email *"} />
                                        <p className="text-xs text-gray-500">Note this field once submitted it can only be updated with the help of administrator.</p>
                                    </div>
                                    <TextInput
                                        value={companyEmail}
                                        onChange={(e) => setcompanyEmail(e.target.value)}
                                        theme={customInputBoxTheme} color={"focuscolor"} id="cmpEmail" type="email" placeholder={formType ? "Your Email" : "Company Email *"} required shadow />
                                </div>

                                <div>
                                    <div className="mb-2 block">
                                        <Label htmlFor="Town" value={formType ? "Phone No. *" : "Company Phone No. *"} />
                                    </div>
                                    <TextInput
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        theme={customInputBoxTheme} color={"focuscolor"} id="phones" type="tel" placeholder={formType ? "Phone numbers" : "The company's phone numbers"} maxLength={10} required shadow />
                                </div>
                                <div>
                                    <div className="mb-2 block">
                                        <Label htmlFor="Town" value="Account Password *" />
                                        <p className="text-xs text-gray-500">Your password: {companypassword}</p>
                                    </div>
                                    <TextInput
                                        value={companypassword}
                                        onChange={(e) => setcompanypassword(e.target.value)}
                                        theme={customInputBoxTheme} color={"focuscolor"} id="cmpPass" type="password" placeholder="The Account Password (6 characters min)" required shadow />
                                </div>

                            </>


                            :

                            <>
                                <div>
                                    <div className="mb-2 block">
                                        <Label htmlFor="Town" value="Company Name *" />
                                        <p className="text-xs text-gray-500">Note this field once submitted it can only be updated with the help of administrator.</p>
                                    </div>
                                    <TextInput
                                        value={companyName}
                                        onChange={(e) => setcompanyName(e.target.value)}
                                        theme={customInputBoxTheme} color={"focuscolor"} id="cmpName" type="text" placeholder="The company's Name" required shadow />
                                </div>


                                <div>
                                    <div className="mb-2 block">
                                        <Label htmlFor="regno" value="Registration Number *" />
                                        <p className="text-xs text-gray-500">Note this field once submitted it can only be updated with the help of administrator.</p>
                                    </div>
                                    <TextInput
                                        value={RegistrationNo}
                                        onChange={(e) => setRegistrationNo(e.target.value)}
                                        theme={customInputBoxTheme} color={"focuscolor"} id="regno" type="text" placeholder="Registration Number" required shadow />
                                </div>

                                <div>
                                    <div className="mb-2 block">
                                        <Label htmlFor="Town" value={formType ? "Name *" : "Company Representative"} />
                                    </div>
                                    <TextInput
                                        value={YourName}
                                        onChange={(e) => SetYourName(e.target.value)}
                                        theme={customInputBoxTheme} color={"focuscolor"} id="cmpName" type="text" placeholder={formType ? "Your Name" : "Company Representative"} required shadow />
                                </div>

                                <div>
                                    <div className="mb-2 block">
                                        <Label htmlFor="idnum" value="ID Number *" />
                                    </div>
                                    <TextInput
                                        value={YourID}
                                        onChange={(e) => SetYourID(e.target.value)}
                                        theme={customInputBoxTheme} color={"focuscolor"} id="idnum" type="tel" placeholder={formType ? "Your ID no." : "Representative ID no."} maxLength={13} required shadow />
                                </div>

                                <div>
                                    <div className="mb-2 block">
                                        <Label htmlFor="Town" value={formType ? "Your Email" : "Company Email *"} />
                                        <p className="text-xs text-gray-500">Note this field once submitted it can only be updated with the help of administrator.</p>
                                    </div>
                                    <TextInput
                                        value={companyEmail}
                                        onChange={(e) => setcompanyEmail(e.target.value)}
                                        theme={customInputBoxTheme} color={"focuscolor"} id="cmpEmail" type="email" placeholder={formType ? "Your Email" : "Company Email *"} required shadow />
                                </div>

                                <div>
                                    <div className="mb-2 block">
                                        <Label htmlFor="Town" value={formType ? "Phone No. *" : "Company Phone No. *"} />
                                    </div>
                                    <TextInput
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        theme={customInputBoxTheme} color={"focuscolor"} id="phones" type="tel" placeholder={formType ? "Phone numbers" : "The company's phone numbers"} maxLength={10} required shadow />
                                </div>
                                <div>
                                    <div className="mb-2 block">
                                        <Label htmlFor="Town" value="Account Password *" />
                                        <p className="text-xs text-gray-500">Your password: {companypassword}</p>
                                    </div>
                                    <TextInput
                                        value={companypassword}
                                        onChange={(e) => setcompanypassword(e.target.value)}
                                        theme={customInputBoxTheme} color={"focuscolor"} id="cmpPass" type="password" placeholder="The Account Password (6 characters min)" required shadow />
                                </div>

                                <div>
                                    <div>
                                        <Label htmlFor="file-upload-helper-text" value="Company Certification *" />
                                    </div>
                                    <FileInput onChange={(event: ChangeEvent<HTMLInputElement>) => setCertificate(event?.target?.files ? event?.target?.files[0] : null)} accept=".pdf" id="file-upload-helper-text" helperText=".pdf*" />
                                </div>

                            </>
                        }






                        <div>
                            <div className="mb-2 block">
                                <Label htmlFor="Town" value={formType ? "Your Address*" : "Compay's Address*"} />
                            </div>

                            <Select id="addrSecltor" onChange={(e) => setAddress(e.target.value)} className="max-w-md" theme={customselectTheme} color={"success"} required>
                                {ProvinceData?.map((item, index) => (
                                    <optgroup label={item.province} key={item.Id}>
                                        {item?.Towns?.map((ars, index) => (
                                            <option key={index}>{ars.area}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </Select>

                        </div>
                        <div>
                            <div className="mb-2 block">
                                <Label htmlFor="Town" value={formType ? "Your Service(s) *" : "Company's Service(s) *"} />
                                <span className="text-xs text-gray-600 font-light text-wrap"> Limit : 15</span>
                            </div>
                            <Select onChange={(e) => AppendSelectedServices(e.target.value)} className="max-w-md" id="Service" theme={customselectTheme} color={"success"} required>
                                {ServiceData?.map((item) => (
                                    <optgroup label={item.ServiceType} key={item.Id}>
                                        {item?.actualTask?.map((ars, index) => (
                                            <option key={index}>{ars.task}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </Select>
                            <div className="grid grid-cols-3  gap-1 pt-2">
                                {selectedServices?.map((itm, index) => (
                                    <div key={index} className='flex flex-wrap gap-2'>
                                        <Badge onClick={() => RemoveServices(itm)} className="w-fit hover:cursor-pointer bg-appGreen text-white" icon={HiTrash} color="success">{itm}</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>


                        <div className="flex items-center gap-2">
                            <Checkbox id="agree" checked={tncs} onChange={() => setTnCs(tncs ? false : true)} theme={customCheckboxTheme} color="success" />
                            <Label htmlFor="agree" className="flex">
                                I agree with the&nbsp;
                                <Link href="terms-and-conditions" className="text-appGreen hover:underline dark:text-appGreen">
                                    terms and conditions
                                </Link>
                            </Label>
                        </div>
                        {Visibility ? <Online><Button isProcessing={isprocessing} disabled={isprocessing} theme={customsubmitTheme} type="submit" color="appsuccess">Register</Button></Online>
                            : <Alert color="warning" rounded>
                                <span className="font-medium">Wellcome!</span> Thank You For Registering With Us.
                            </Alert>}
                        <Offline>
                            <Alert color="warning" icon={HiInformationCircle}>
                                <span className="font-medium">Info alert!</span>{NetworkTitle}
                                <p className="text-xs text-gray-500">{NetworkMessage}</p>
                            </Alert></Offline>
                    </form>
                    <ReCAPTCHA
                        className='self-center'
                        sitekey={("6Lc6SdMpAAAAAD5XHKyVRfFFqheA6T5r4QAvSTJI" || process.env.NEXT_PUBLIC_SITE_KEY)?.toString()}
                        onChange={(e) => handleRecaptchaChange(e)}
                    />
                </Card>
            </div>
        </div>
    );
}

export default ContractorRegistration;