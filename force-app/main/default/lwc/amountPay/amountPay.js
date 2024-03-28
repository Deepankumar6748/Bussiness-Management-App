import { track,api } from 'lwc';
import LightningModal from 'lightning/modal';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
export default class AmountPay extends LightningModal {
    @track Amttype;
    @track Amount;
    @track options = [
        {label: 'Wage',value: 'Wage'},
        {label: 'Purchase Bill',value: 'Purchase Bill'},
        {label: 'Customer Bill',value: 'Customer Bill'}
    ]
    handleChangeType(event){
        this.Amttype = event.target.value;
        console.log("this.Amttype",this.Amttype);
    }

    handleAmtchange(event){
        this.Amount = event.target.value;
        console.log("this.Amount",this.Amount);
    }
    handleClickDone(){
        if(this.Amttype && this.Amount){
            const event = new CustomEvent('submit', { detail: { amttype: this.Amttype, amount: this.Amount } });
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