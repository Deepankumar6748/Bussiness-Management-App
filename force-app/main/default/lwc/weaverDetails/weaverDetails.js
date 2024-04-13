import { LightningElement,api,track,wire } from 'lwc';
import { createRecord,getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import SALARY_BALANCE from '@salesforce/schema/Account.SalaryBalance__c'
import getRecordsTowOrRawMatWt from '@salesforce/apex/WeaverRecordDetails.getRecordsTowOrRawMatWt';
export default class WeaverDetails extends LightningElement  {
    @api recordId;
    //For  Weight Details part
    @track NormalWtDetails;
    @track BlackWtDetails;
    @track WtDetails6666;
    @track TotalBalanceWage;
    @track UnCalculatedWageDetails;

    @wire(getRecordsTowOrRawMatWt,{recordId: '$recordId'})
    wiredTowOrRawMatWt({ error, data }) {
        if (data) {
            let records = JSON.parse(JSON.stringify(data));
            //console.log("records",JSON.stringify(records));
            this.UnCalculatedWageDetails = records.filter(record => !record.WageCalculated__c);
            this.NormalWtDetails = records.filter(record => record.TowelWeightType__c === 'Normal');
            this.BlackWtDetails = records.filter(record => record.TowelWeightType__c === 'Black');
            this.WtDetails6666 = records.filter(record => record.TowelWeightType__c === '6666');
        }
         else if (error) {
            console.error(error);
        }

    }     

    @wire(getRecord, { recordId: "$recordId", fields: [SALARY_BALANCE] })      
    wiredData({ error, data }) {
        if (data) {
            this.TotalBalanceWage = data.fields['SalaryBalance__c'].value;
        } else if (error) {
            let errorMessage = 'Unknown error';
                if (Array.isArray(error.body)) {
                    errorMessage = error.body.map(e => e.message).join(', ');
                } else if (typeof error.body.message === 'string') {
                    errorMessage = error.body.message;
                }
                this.dispatchEvent(new ShowToastEvent({
                    title: "Error",
                    message: errorMessage,
                    variant: "error"
                }));
        }
    }
}
