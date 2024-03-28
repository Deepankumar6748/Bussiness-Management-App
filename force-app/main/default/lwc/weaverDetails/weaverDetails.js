import { LightningElement,api,track,wire } from 'lwc';
import { createRecord,getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import SALARY_BALANCE from '@salesforce/schema/Account.SalaryBalance__c'
import getRecordsTowOrRawMatWt from '@salesforce/apex/WeaverRecordDetails.getRecordsTowOrRawMatWt';
import SIGNIFICANT_AMT from '@salesforce/schema/Account.SignificantWageBal__c'
export default class WeaverDetails extends LightningElement  {
    @api recordId;
    //For  Weight Details part
    @track NormalWtDetails;
    @track BlackWtDetails;
    @track WtDetails6666;
    @track TotalBalanceWage;
    @track AllWageDetails;
    @track SignificantWageBal;      //This is the bal amt that is not tallyed while paying wages that is splitted to each record


    @wire(getRecordsTowOrRawMatWt,{recordId: '$recordId'})
    wiredTowOrRawMatWt({ error, data }) {
        if (data) {
            this.AllWageDetails = data.filter(record => record.TowelOrRawMaterialWeightDetail__r != 0);
            // this.NormalWtDetails = [];
            // this.BlackWtDetails = [];
            // this.WtDetails6666 = [];

            // data.forEach(Record => {
            //     if(Record.TowelWeightType__c === 'Normal'){
            //         this.NormalWtDetails.push({
            //             AccountId__c: Record.AccountId__c,
            //             Date__c : Record.Date__c,
            //             DaySpecificNormalBalanceWt__c : Record.DaySpecificNormalBalanceWt__c,
            //             DaySpecific6666BalanceWt__c : Record.DaySpecific6666BalanceWt__c,
            //             DaySpecificBlackBalanceWt__c : Record.DaySpecificBlackBalanceWt__c,
            //             DaySpecificDeduction__c : Record.DaySpecificDeduction__c,
            //             TowelOrRawMaterialWeightDetails__r : []
            //         });
            //     }
            // });
            this.NormalWtDetails = data.filter(record => record.TowelWeightType__c === 'Normal');
            this.BlackWtDetails = data.filter(record => record.TowelWeightType__c === 'Black');
            this.WtDetails6666 = data.filter(record => record.TowelWeightType__c === '6666');
        }
         else if (error) {
            console.error(error);
        }

    }     

    @wire(getRecord, { recordId: "$recordId", fields: [SALARY_BALANCE,SIGNIFICANT_AMT] })      
    wiredData({ error, data }) {
        if (data) {
            this.TotalBalanceWage = data.fields['SalaryBalance__c'].value;
            this.SignificantWageBal = data.fields['SignificantWageBal__c'].value;
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

    HandleSignificantAmtBalUpdate(event){
        this.SignificantWageBal = event.detail.significantwagebal;
    }

}