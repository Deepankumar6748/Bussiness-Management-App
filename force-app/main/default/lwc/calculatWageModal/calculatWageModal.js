import { track,api } from 'lwc';
import LightningModal from 'lightning/modal';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
export default class CalculatWageModal extends LightningModal {
    @api calculaterecid;
    handleSubmit(){
        this.close();
    }
}