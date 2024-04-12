import { ShowToastEvent } from 'lightning/platformShowToastEvent';
//Creation of record
export const CreateRecorc = (recordInput,dispatchEvent) => {
    return createRecord(recordInput)
      .then(result=>{
          dispatchEvent(new ShowToastEvent({
              title: "Info",
              message: `Record has been created`,
              variant: "info"
          }));
          return result;
      })
      .catch(error=>{
          let errorMessage = 'Unknown error';
          if (Array.isArray(error.body)) {
              errorMessage = error.body.map(e => e.message).join(', ');
          } else if (typeof error.body.message === 'string') {
              errorMessage = error.body.message;
          }
          dispatchEvent(new ShowToastEvent({
              title: "Error",
              message: errorMessage,
              variant: "error"
          }));
          throw error;
      });
}

//Handle Record Updation
export const HandleUpdate = (fields,dispatchEvent) => {
   return updateRecord(fields)
    .then(result=>{
        dispatchEvent(new ShowToastEvent({
            title: "Info",
            message: `Updation Successful`,
            variant: "info"
        }));
        return result;
    })
    .catch(error=>{
        let errorMessage = 'Unknown error';
            if (Array.isArray(error.body)) {
                errorMessage = error.body.map(e => e.message).join(', ');
            } else if (typeof error.body.message === 'string') {
                errorMessage = error.body.message;
            }
            dispatchEvent(new ShowToastEvent({
                title: "Error",
                message: errorMessage,
                variant: "error"
            }));
            throw error;
    });
}