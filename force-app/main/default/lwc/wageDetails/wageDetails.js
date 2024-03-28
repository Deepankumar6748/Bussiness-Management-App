import { LightningElement,api } from 'lwc';
import AmountPay from 'c/amountPay';
export default class WageDetails extends LightningElement {
    @api wagedetails;
    @api TotalBalanceWage;
    connectedCallback(){
        console.log("this.wagedetails",this.wagedetails[0]);
        console.log("this.TotalBalanceWage",this.TotalBalanceWage);
    }

    handleClickWagePay(){
        AmountPay.open(
            {
                onsubmit:(event)=>{
                    const fields = {
                        Amount__c : event.detail.amount,
                        Type__c : event.detail.amttype
                    }
                    console.log("fields",fields[0])
                }
            }
        )
    }
}