import { doRequestOp } from "./doRequestOp";

const URL_PATH = "/artifacts";


export const getArtifact = async (artifactKey: string) => {
    const op = {
        method: 'GET',
        path: URL_PATH,
        op: "/get",
        queryParams: {"artifact_id": artifactKey}
    };
    return await doRequestOp(op);
}



export const getAllArtifacts = async () => {
    const op = {
        method: 'GET',
        path: URL_PATH,
        op: "/get_all",
    };
    return await doRequestOp(op);
}


export const deleteArtifact = async (artifactKey: string) => {
    const op = {
        method: 'DELETE',
        path: URL_PATH,
        op: "/delete",
        queryParams: {"artifact_id": artifactKey}
    };
    const result = await doRequestOp(op);
    return result.success;
}


export const saveArtifact = async (artifactData: any) => {
    const op = {
        method: 'POST',
        path: URL_PATH,
        op: "/save",
        data: {artifact: artifactData}
    };
    return await doRequestOp(op);
}


export const shareArtifact = async (artifactData: any,  emailList: string[]) => {
    const op = {
        method: 'POST',
        path: URL_PATH,
        op: "/share",
        data: {
            artifact: artifactData,
            shareWith: emailList
        }
    };
    return await doRequestOp(op);
}

