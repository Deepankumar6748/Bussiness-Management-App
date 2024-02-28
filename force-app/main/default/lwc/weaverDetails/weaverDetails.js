import { LightningElement,api,track,wire } from 'lwc';
import { createRecord,getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import getRecordsTowOrRawMatWt from '@salesforce/apex/WeaverRecordDetails.getRecordsTowOrRawMatWt';
import ACCOUNT_OBJECT from '@salesforce/schema/Account';

export default class WeaverDetails extends LightningElement  {
    @api recordId;
    //For  Weight Details part
    @track NormalWtDetails;
    @track BlackWtDetails;
    @track WtDetails6666;

    

    @wire(getRecordsTowOrRawMatWt,{recordId: '$recordId'})
    wiredTowOrRawMatWt({ error, data }) {
        if (data) {
            this.NormalWtDetails = data.filter(record => record.TowelWeightType__c === 'Normal');
            this.BlackWtDetails = data.filter(record => record.TowelWeightType__c === 'Black');
            this.WtDetails6666 = data.filter(record => record.TowelWeightType__c === '6666');
        }
         else if (error) {
            console.error(error);
        }
    }     
}