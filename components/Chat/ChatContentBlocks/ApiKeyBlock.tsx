import {useContext, useEffect, useRef, useState} from "react";
import HomeContext from "@/pages/api/home/home.context";
import {IconKey, IconRobot, IconUser} from "@tabler/icons-react";
import styled, {keyframes} from "styled-components";
import {FiCommand} from "react-icons/fi";
import { useSession } from "next-auth/react"
import { ApiKey, ApiRateLimit } from "@/types/apikeys";
import { formatAccessTypes, formatLimits, HiddenAPIKey } from "@/components/Settings/AccountComponents/ApiKeys";
import ExpansionComponent from "../ExpansionComponent";
import { Account } from "@/types/accounts";
import { createApiKey, deactivateApiKey } from "@/services/apiKeysService";



const animate = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(720deg);
  }
`;

const LoadingIcon = styled(FiCommand)`
  color: lightgray;
  font-size: 1rem;
  animation: ${animate} 2s infinite;
`;

interface KeyData {
    id: string;
    name: string;
}

interface KeyUpdate {
    id: string;
    name: string;
    rateLimit?: ApiRateLimit;
    expiration?: string;
    accessTypes?: string[];
    account?: Account;
}

interface Props {
    content: string;
}


const ApiKeyBlock: React.FC<Props> = ({content}) => {
    const [error, setError] = useState<string | null>(null);
    const [op, setOP] = useState<string>("");
    const [data, setData] = useState<any>(null);
    const [requiredCreateKeys, setRequiredCreateKeys] = useState<any>(null);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
    const {state:{selectedConversation, statsService, messageIsStreaming},  dispatch:homeDispatch} = useContext(HomeContext);
    const { data: session } = useSession();

    const [isCreated, setIsCreated] = useState<boolean>(false);
    
    const user = session?.user;

    useEffect(() => {
        const extractData = () => {
            try {
                const opData = JSON.parse(content);
                let attr = opData.DATA;
                if (attr) {
                    setOP(opData.OP);
                    setData(attr);
                    setLoadingMessage(null);
                }
            } catch {
                // setLoadingMessage("We are making progress on your request.");
                console.log("Extract data error")
            }  
        }
        if (op === "" || !data) extractData();
    }, [content]);


    const handleDeactivateAPIKey = async (id: string) => {
        const result = await deactivateApiKey(id);
        alert(result ? "Successfuly deactivated the API key" : "Unable to deactivate the API key at this time. Please try again later...");
    }

    const handleCreateAPIKey = async () => {
        console.log()
        if (!requiredCreateKeys.isComplete) {
            alert("Incomplete key data...\n Missing data: " + requiredCreateKeys.missingKeys.join(''));
        } else if (data.systemUse && data.delegate) {
            //check no delegate if system use
            alert("You cannot have a delegate defined when creating a system key. Specified one or the either as none.");
        } else {
            setLoadingMessage("Creating API key...");
            const result = await createApiKey({...data, owner: user?.email});
            if (result) setIsCreated(true);
            setLoadingMessage(null);
            alert(result ? "Successfuly created the API key" : "Unable to create the API key at this time. Please try again later...");    
        }
    }

    const handleUpdateAPIKey = async (id: string) => {

    }
    
    const formatLabel = (label: string, data: any) => {
        const title = label.replace(/([A-Z])/g, ' $1')
                    .replace(/^./, function(match) {
                        return match.toUpperCase(); 
                    });
        let dataLabel = data || "N/A";
        switch (label) {
            case ('account'):
                dataLabel = `${data.name}\n\t${data.id}`
                break;
            case ('rateLimit'):
                dataLabel = formatLimits(data);
                break;
            case ('accessTypes'):
                dataLabel = formatAccessTypes(data);
                break;
        }
        return `${title}: ${dataLabel}`;
    }

    useEffect(() => {
        const verifyRequiredKeys = () => {
            const requiredKeys = ['delegate', 'account', 'appName', 'appDescription', 'rateLimit', 'accessTypes', 'systemUse', 'expiration'];
            if (!data) return {isComplete: false, missingKeys: requiredKeys};
            
            // Check if all required keys are present in the data object
            const missingKeys = requiredKeys.filter((key:string) => {
                const present = Object.keys(data).includes(key);

                const val = data[key];
                if ((present && val && typeof val === 'string') && (val.includes("N/A") || val.includes("null"))) {
                    setData((prevData: any) => ({
                        ...prevData,
                        [key]: null
                    }));
                }
                return !present;
            });
            // If there are no missing keys, the data is considered complete
            return {isComplete: missingKeys.length === 0, missingKeys: missingKeys};
        }
        if (op === 'CREATE') setRequiredCreateKeys(verifyRequiredKeys());
    }, [data]);

    // @ts-ignore
    return error ?
        <div>{error}</div> :
        <div style={{maxHeight: "450px"}}>
            {loadingMessage ? (
                <div className="flex flex-row justify-center items-center"><LoadingIcon/> <div className="ml-2">{loadingMessage}</div></div>
            ) : ( !data ? ("We are making progres on your request...") : (
                <>
                    <div className="flex flex-col w-full mb-4 overflow-x-hidden gap-0.5">
                        <div className="flex flex-row items-center justify-center">
                            { op === 'CREATE' && 
                            <div title={`${data.systemUse ? 'System' : data.delegate ? 'Delegate' : 'Personal'} Use`} >
                             <IconUser style={{ strokeWidth: 2.5 }} className={`mr-2 flex-shrink-0 ${data.systemUse
                                ? 'text-green-600' : data.delegate 
                                ? 'text-yellow-500' : 'text-gray-600 dark:text-gray-400'}`} size={28}
                            />
                            </div> 
                            }
                            <div className="text-2xl font-bold">{`${op}${isCreated?'D':''}`}</div>
                            <IconKey className="ml-2" size={26}/>
                        </div>
                        
                         <div className="flex flex-col gap-4 items-center">
                            {op === 'GET' && 
                            data.map((k:KeyData) => (
                                <div className="flex justify-center items-center w-full max-w-lg" key={k.name}>
                                    <div className="flex-grow text-right mr-2">{k.name}</div>
                                    <HiddenAPIKey id={k.id} width="380px" />
                                </div>
                            ))
                            }
                         </div>   

                         
                        <div className="flex flex-col gap-4">
                            {op === 'DEACTIVATE' && 
                            data.map((k: KeyData) => (
                                <div className="flex items-center w-full max-w-lg" key={k.name}>
                                    <div className="flex-grow text-right mr-3">{k.name}</div>
                                     <OpButton 
                                        op={op}
                                        handleClick={() => handleDeactivateAPIKey(k.id)}
                                        color={'red'}
                                    />
                                </div>
                            ))
                            }
                        </div>

                        {op === 'UPDATE' && 
                            data.map((k: KeyUpdate) => (
                                <div className="ml-12 mb-4 w-full max-w-lg" key={k.name}>
                                    <ExpansionComponent title={`${k.name} Updates`} 
                                            content={[
                                                (k.account && <div > {formatLabel('account', k.account)} </div> ),
                                                (k.expiration && <div> {formatLabel("expiration", k.expiration)}</div>), 
                                                (k.accessTypes && <div>{formatLabel("accessTypes", k.accessTypes)}</div>),
                                                (k.rateLimit && <div>{formatLabel("rateLimit", k.rateLimit)}</div>),
                                            <div className="absolute right-20 top-50" style={{transform: 'translateY(-100%)'}}>
                                                <OpButton 
                                                    op={op}
                                                    handleClick={async() => {await handleUpdateAPIKey(k.id)}}  
                                                />
                                            </div>,
                                    ]}
                                    />
                                </div>
                            ))
                        }

                        {op === 'CREATE' && (
                            <>
                                <div className="my-4 ml-20 flex justify-center">
                                    <div className="ml-10 w-full max-w-lg">
                                        {Object.keys(data).map((k) => (
                                        <div className='flex-grow text-left' key={k}>
                                            {formatLabel(k, data[k])}
                                        </div>
                                        ))}
                                    </div>
                                </div>
                                { isCreated ? <></> :
                                    (<OpButton
                                    op={op}
                                    handleClick={handleCreateAPIKey} // Assuming data contains id, adjust if needed
                                    color={requiredCreateKeys && requiredCreateKeys.isComplete ? 'green' : `red`}
                                    width="w-full"
                                    />)
                                }
                            </>
                            )}
                        
                    </div>
                </>
            ))
        }
        </div>;
};

export default ApiKeyBlock;


interface buttonProps {
    op: string;
    handleClick: (k:any) => void;
    color?: string;
    width?: string;
}

const OpButton: React.FC<buttonProps> = ({op,handleClick, color="green", width=''}) => {

    function formatString(str: String) {
        if (!str) return str; // Handle null, undefined, or empty string
        return str.charAt(0) + str.slice(1).toLowerCase();
    }

    return <button className={`mr-14 px-2 py-1 text-white bg-blue-500 rounded hover:bg-${color}-600 ${width}`}
                    onClick={handleClick}
            >
                {`${formatString(op)} API Key`}
        </button>

}