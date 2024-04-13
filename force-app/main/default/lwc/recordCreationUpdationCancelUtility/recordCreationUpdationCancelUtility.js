import { createRecord,getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
//Creation of record
export const CreateRecorc = (recordInput) => {
    return createRecord(recordInput)
      .then(result=>{
          return result;
      })
      .catch(error=>{
          throw error;
      });
}

//Handle Record Updation
export  const HandleUpdate = async (fields) => {
    const RecIp = {fields}
    console.log("Upation Entered")
    try {
        const res = await updateRecord(RecIp)
        console.log("Record Updated");
        return res;
    } catch (error) {
        console.error("Record not Updated");
        return  error;
    }
}