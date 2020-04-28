import { Component, OnInit, Input } from '@angular/core';
import { CompanyService } from '../../../../services/company.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ValidationService } from '../../../../services/validation.service';
import { BsModalRef } from 'ngx-bootstrap';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-inbound',
  templateUrl: './inbound.component.html',
  styleUrls: ['./inbound.component.css'],
  providers: [CompanyService, ValidationService]
})
export class InboundComponent implements OnInit {
  
  inboundForm: FormGroup;
  closePopup: Subject<any>;

  @Input('settings')
  settings;


  constructor(private companyService: CompanyService,
    private fbForm: FormBuilder,
    private validationService: ValidationService,
    private bsModelRef: BsModalRef) {
    this.inboundForm = this.fbForm.group({
      type: ["imap", [<any>Validators.required]],
      host: [null, [<any>Validators.required]],
      user: [null, [<any>Validators.required]],
      password: [null, [<any>Validators.required]],
      ssl: [null],
      port: [null],
      folder: [null],
      messages: [null]
    });
  }

  ngOnInit() {
    this.closePopup = new Subject<any>();
    this.inboundEdit();
  }

  inboundEdit() {
    if (this.settings) {
      this.settings.forEach(setting => {
        this.inboundForm.get(setting.key).setValue(setting.value);
      });
    }
  }

  editInbound(form) {
    if (!this.inboundForm.valid) {
      this.validationService.validateAllFormFields(this.inboundForm);
    } else {
      this.companyService.editSettings(form, this.settings.company._id, form.type).subscribe(result => {
        if (result['success']) {
          //close model
          this.closePopup.next(result['success']);
          this.bsModelRef.hide();
        }
      });
    }
  }

}
