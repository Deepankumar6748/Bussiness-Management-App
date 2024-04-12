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
export const HandleUpdate = (fields) => {
    const RecIp = {fields}
    console.log("Upation Entered")
   return updateRecord(RecIp)
    .then(result=>{
        console.log("Record Updated");
        return result;
    })
    .catch(error=>{
        console.error("Record not Updated");
        throw error;
    });
}