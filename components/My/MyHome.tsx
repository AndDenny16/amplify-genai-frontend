import DataSourcesTable from "@/components/DataSources/DataSourcesTable";
import {FC, useContext, useState} from "react";
import {IconFiles} from "@tabler/icons-react";
import HomeContext from "@/pages/api/home/home.context";

export interface MyHomeProps {

}

export const MyHome: FC<MyHomeProps> = ({

                                  }) => {
    const {
        state: { lightMode },
    } = useContext(HomeContext);


    const [responseTokenRatio, setResponseTokenRatio] = useState(
        3
    );



    return (
        <div className="relative flex-1 overflow-hidden bg-white dark:bg-[#343541]">

                <div className="mx-auto flex flex-col p-2 text-gray-600 dark:text-gray-400">
                    <div className="pt-3 px-2 items-center mt-6 text-left text-3xl font-bold  text-gray-600  dark:text-gray-400 flex flex-row items-center">
                        <div>
                            <IconFiles size={36}/>
                        </div>
                        <div className="ml-2">Your Files</div>
                    </div>
                    <div className="mt-2">
                        <DataSourcesTable />
                    </div>
                </div>
        </div>
    );
}