import { LightningElement, wire, track } from 'lwc';
import getAccountsWeaver from '@salesforce/apex/RecordListController.getAccountsWeaver';
import getAccountsearchWeaver from '@salesforce/apex/RecordListController.getAccountsearchWeaver';

export default class RecordListView extends LightningElement {
    @track searchKeyword = '';
    @track accounts;
    columns = [
        { label: 'Name', fieldName: 'Name', type: 'text' },
        { label: 'Phone', fieldName: 'Phone', type: 'Phone' },
        { label: 'Place', fieldName: 'Place__c', type: 'text' }
        // Add more columns as needed
    ];

    connectedCallback() {
        this.loadAccounts();
    }

    loadAccounts() {
        getAccountsWeaver()
            .then(result => {
                this.accounts = result;
            })
            .catch(error => {
                console.error('Error loading accounts', error);
            });
    }

    handleRowAction(event){
        const accrecordId = event.detail.row.Id;
        this[NavigationMixin.Navigate]({
            type:'Standard__recordPage',
            attributes:{
                accrecordId : accrecordId,
                ObjectApiName: 'Account',
                actionName : 'view',
            }
        });
    }

    handleSearchChange(event) {
        this.searchKeyword = event.target.value;
    }

    @wire(getAccountsearchWeaver, { searchKeyword: '$searchKeyword' })
    wiredAccounts({ error, data }) {
        if (data) {
            this.accounts = data;
        } else if (error) {
            console.error(error);
        }
    } 
}
