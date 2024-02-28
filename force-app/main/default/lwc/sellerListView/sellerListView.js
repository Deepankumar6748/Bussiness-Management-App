import { LightningElement, wire, track } from 'lwc';
import getAccountsSeller from '@salesforce/apex/RecordListController.getAccountsSeller';
import getAccountsearchSeller from '@salesforce/apex/RecordListController.getAccountsearchSeller';

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
        getAccountsSeller()
            .then(result => {
                this.accounts = result;
            })
            .catch(error => {
                console.error('Error loading accounts', error);
            });
    }

    handleSearchChange(event) {
        this.searchKeyword = event.target.value;
    }

    @wire(getAccountsearchSeller, { searchKeyword: '$searchKeyword' })
    wiredAccounts({ error, data }) {
        if (data) {
            this.accounts = data;
        } else if (error) {
            console.error(error);
        }
    } 
}
