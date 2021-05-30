import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';

import { ApiService } from './services/api.service';
import { MachineService } from './services/machine.service';
import { ContainerService } from './services/container.service';


@NgModule({
  imports: [
    HttpModule
  ],
  providers: [
    ApiService,
    MachineService,
    ContainerService
  ]
})
export class SharedModule {}