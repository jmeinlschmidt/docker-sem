import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule  } from '@angular/forms';

import { SharedModule } from './shared/shared.module';

import { AppComponent } from './app.component';
import { MachineService } from './shared/services/machine.service';
import { ApiService } from './shared/services/api.service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    ApiService,
    MachineService
  ],
  bootstrap: [
    AppComponent
  ]
})

export class AppModule { }
