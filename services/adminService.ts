import { doRequestOp } from "./doRequestOp";

const URL_PATH = "/amplifymin";

export const updateAdminConfigs = async (configs: any[]) => {
    const op = {
        method: 'POST',
        data: { configurations: configs },
        path: URL_PATH,
        op: "/configs/update",
    };
    return await doRequestOp(op);
}


export const getAdminConfigs = async () => {
    const op = {
        method: 'GET',
        path: URL_PATH,
        op: "/configs/get",
    };
    return await doRequestOp(op);
}


export const getFeatureFlags = async () => {
    const op = {
        method: 'GET',
        path: URL_PATH,
        op: "/feature_flags/get",
    };
    return await doRequestOp(op);
}


export const getPowerPoints = async () => {
    const op = {
        method: 'GET',
        path: URL_PATH,
        op: "/pptx_templates/get",
    };
    return await doRequestOp(op);
}



export const getAvailableModels = async () => {
    const op = {
        method: 'GET',
        path: "/available_models",
        op: "",
    };
    return await doRequestOp(op);
}


export const terminateEmbedding = async (key: any) => {
    const op = {
        data: {object_key: key},
        method: 'POST',
        path: "/embedding",
        op: '/terminate',
    };
    return await doRequestOp(op);
}


export const getInFlightEmbeddings = async () => {
    const op = {
        method: 'GET',
        path: "/embedding",
        op: '/sqs/get',
    };

    const result = await doRequestOp(op);
    try {
        const resultBody = result ? JSON.parse(result.body || '{}') : {"success": false};
        if (resultBody.success) {
            return resultBody.messages;
        } else {
            return null;
        }
    } catch (e) {
        console.error("Error parsing result body: ", e);
        return null;
    }
}


export const testEndpoint = async (url: string, key: string, model:string) => {
    try {
      const response = await fetch('/api/admin/testEndpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, key, model }),
      });
  
      const result = await response.json();
      console.log("TEST: ", result )
      return result.success;
    } catch (e) {
      console.error('Error testing endpoint: ', e);
      return false;
    }
  };


export const uploadPptx = async (data: {fileName: string, isAvailable: boolean, 
    amplifyGroups: string[], contentType:string, md5: any}) => {

    const op = {
        method: 'POST',
        data: data,
        path: URL_PATH,
        op: "/pptx_templates/upload",
    };
    return await doRequestOp(op);
}



export const deletePptx = async (templateName: string) => {
    const op = {
        method: 'DELETE',
        path: URL_PATH,
        op: "/pptx_templates/delete",
        queryParams: {"template_name": templateName}
    };
    return await doRequestOp(op);
}





