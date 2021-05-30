import { Component, ViewEncapsulation, OnInit } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';

import { MachineService, Machine } from './shared/services/machine.service';
import { ContainerCreateRequest, ContainerKillRequest, ContainerService } from './shared/services/container.service';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/interval';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit {
  public createContainerForm: FormGroup;
  public killContainerForm: FormGroup;
  public machines: Machine[] = [];
  public machineHashes: String[];
  public availableImages: String[] = ['nginx'];
  public selectedMachine: String;
  public selectMachineFreeRam: string;
  public machineDaemon: Machine;
  public runningWorkers: Machine[] = [];
  public isDataLoaded: Boolean = false;
  public noWorkers: Boolean = true;

  constructor(private _machineService: MachineService, private _containerService: ContainerService) { }

  public ngOnInit() {
    // Initial check
    this._machinesCheck();

    this.setFormGroups();
    this._setMachinesInterval();
  }

  public createContainer(containerCreateRequest: ContainerCreateRequest, isValid: boolean) {
    if (isValid) {
      this._containerService.createContainer(containerCreateRequest).subscribe();
      this.createContainerForm.reset();
    }
  }

  public killContainer(hash: string, isValid: boolean) {
    if (isValid) {
      this._containerService.killContainer(hash).subscribe();
      this.killContainerForm.reset();
    }
  }

  public selectMachine(machineHash) {
    this.machines.forEach(machine => {
      if (machine.hash === machineHash) {
        this.selectMachineFreeRam = ((machine.stats.ramLimit -  machine.stats.ramCurrent) / 1000000 ).toFixed(2);
      }
    });
  }

  private _setMachinesInterval() {
    const interval = Observable.interval(5000).subscribe(
      () => this._machinesCheck()
    );
  }

  private _updateMachines(machines) {
    this.machines = machines;
    this.machineHashes = [];
    this.runningWorkers = [];

    this.machines.forEach(machine => {
      if (machine.status === 'running' && machine.type === 'worker') {
        this.runningWorkers.push(machine);
        this.machineHashes.push(machine.hash);
        console.log(this.runningWorkers);
      } else if (machine.status === 'running' && machine.type === 'daemon') {
        this.machineDaemon = machine;
      }
    });

    this.isDataLoaded = true;
    if (this.runningWorkers.length > 0) {
      this.noWorkers = false;
    }
  }

  private _machinesCheck() {
    this._machineService.getMachines().subscribe(
      data => {
        this._updateMachines(data);
      }
    );
  }

  public setFormGroups() {
    this.createContainerForm = new FormGroup({
      machine: new FormControl(null, Validators.required),
      image: new FormControl(null, Validators.required),
      ramLimit: new FormControl(null, [Validators.required, Validators.pattern(/^[\d]+$/)]),
    });

    this.killContainerForm = new FormGroup({
      hash: new FormControl(null, [Validators.required, Validators.pattern(/^[\d\w]+/)])
    });
  }
}
