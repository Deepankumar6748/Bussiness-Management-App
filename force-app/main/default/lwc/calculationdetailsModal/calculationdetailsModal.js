import { LightningElement,api,track,wire } from 'lwc';
import LightningModal from 'lightning/modal';
import calculationdetails from '@salesforce/apex/getrecords.calculationdetails';
export default class CalculationdetailsModal extends LightningModal {
    @api calculationid;
    @track Calculationdetails;
    @wire(calculationdetails, {calcid : '$calculationid'})
    calcdetails({error, data}) {
        if (data) {
            // TODO: Error handling
            let records = JSON.parse(JSON.stringify(data));
            this.Calculationdetails = records;
            console.log("Calculation details retrieved"+JSON.stringify(records))
        } 
        else if (error) {
            // TODO: Data handling
            console.error("Calculation details error"+error);
            this.ErrorToastmsg(error);
        }
    }

    ErrorToastmsg(error){
        let errorMessage = 'Unknown error';
              try {
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
              } catch (error) {
                dispatchEvent(new ShowToastEvent({
                    title: "Error",
                    message: errorMessage,
                    variant: "error"
                }));
              }
              
      }
}