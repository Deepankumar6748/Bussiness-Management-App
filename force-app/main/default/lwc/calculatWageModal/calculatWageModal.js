import { track,api } from 'lwc';
import LightningModal from 'lightning/modal';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
export default class CalculatWageModal extends LightningModal {
    @api calculaterecid;
    handleSubmit(){
        const event = new CustomEvent('submit', { detail: { recid: this.calculaterecid} });
        this.dispatchEvent(event);
        this.close();
    }
}