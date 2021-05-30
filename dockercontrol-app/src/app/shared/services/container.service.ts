import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import { ApiService } from './api.service';
import { Stats } from './machine.service';

import { environment } from '../../../environments/environment';

interface IContainerService {
    createContainer(containerRequest: ContainerCreateRequest): Observable<Container>;
}

export interface ContainerCreateRequest {
    machine: string;
    image: string;
    ramLimit: number;
}

export interface ContainerKillRequest {
    machine: string;
    hash: string;
}

export interface Container {
    hash: string;
    name: string;
    image: string;
    stats: Stats;
    address: string;
    machine: string;
}

@Injectable()
export class ContainerService implements IContainerService {

    constructor(private _apiService: ApiService) { }

    public createContainer(containerCreateRequest: ContainerCreateRequest): Observable<Container> {
        containerCreateRequest.ramLimit = containerCreateRequest.ramLimit * 1000000;

        return this._apiService.create<Container>(environment.api.container, containerCreateRequest);
    }

    public killContainer(hash: string): Observable<Container> {
        return this._apiService.delete<Container>(environment.api.container, hash);
    }
}
