import { track,api,wire } from 'lwc';
import LightningModal from 'lightning/modal';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getPicklistValues,getObjectInfo } from 'lightning/uiObjectInfoApi';
import AMOUNT_OBJECT from "@salesforce/schema/Amount__c";
import FIELD_NAME from '@salesforce/schema/Amount__c.ModeOfPay__c';
export default class AmountPayWage extends LightningModal {
    @track Amount;
    @track ModeOfPay;
    @api limitamount;
    @track options;
    @track amountRecordTypeId;

    @wire(getObjectInfo, { objectApiName: AMOUNT_OBJECT })
    results({ error, data }) {
        if (data) {
            this.amountRecordTypeId = data.defaultRecordTypeId;
        } else if (error) {
            console.error('Error fetching getObjectInfo values', error);
        }
    }

    @wire(getPicklistValues, { recordTypeId: "$amountRecordTypeId", fieldApiName: FIELD_NAME })
    wiredPicklistValues({ error, data }) {
        if (data) {
            this.options = data.values;
        } else if (error) {
            console.error('Error fetching picklist values', error);
        }
    }

    handleChangeModeOfPay(event){
        this.ModeOfPay = event.target.value;
        console.log("this.ModeOfPay",this.ModeOfPay);
    }

    handleAmtchange(event){
        if (this.limitamount) {
            if (event.target.value <= this.limitamount) {
                this.Amount = event.target.value;
                console.log("this.Amount",this.Amount);
            } else {
                this.Amount = null ;
                this.dispatchEvent(new ShowToastEvent({
                    title: "Warning",
                    message: "Enter Amount less than or equal to "+this.limitamount,
                    variant: "warning"
                }));
            }
        } else {
            this.Amount = event.target.value;
            console.log("this.Amount",this.Amount);
        }
    }
    handleClickDone(){
        if(this.ModeOfPay && this.Amount > 0){
            const event = new CustomEvent('submit', { detail: { modeofpay: this.ModeOfPay, amount: this.Amount } });
            this.dispatchEvent(event);
            this.close();
        }else{
            this.dispatchEvent(new ShowToastEvent({
                title: "Warning",
                message: "Fill all the fields",
                variant: "warning"
            }));
        }
    }
}