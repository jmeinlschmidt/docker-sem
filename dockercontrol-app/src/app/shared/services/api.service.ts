import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/throw';

import { environment } from '../../../environments/environment';

const apiUrl = 'http://' + environment.api.url + '/';

interface IApiService {
    getAll<T>(path: string): Observable<T>;
    getSingle<T>(path: string, id: string|number): Observable<T>;
    create<T>(path: string, body: object): Observable<T>;
    update<T>(path: string, id: string|number, body: object): Observable<T>;
    delete<T>(path: string, id: string|number): Observable<T>;
}

@Injectable()
export class ApiService implements IApiService {
    constructor(private http: Http) { }

    public getAll<T>(path: string): Observable<T> {
        console.log(apiUrl + path);
        return this.http
            .get(apiUrl + path)
            .map((response: Response) => {
                return response.json();
            })
            .catch(this.handleError);
    }

    public getSingle<T>(path: string, id: string|number): Observable<T> {
        return this.http
            .get(apiUrl + path + '/' + id)
            .map((response: Response) => {
                return <T>response.json();
            })
            .catch(this.handleError);
    }

    public create<T>(path: string, body: object): Observable<T> {
        return this.http
            .post(apiUrl + path, body)
            .map((response: Response) => {
                return <T>response.json();
            })
            .catch(this.handleError);
    }

    public update<T>(path: string, id: string|number, body: object): Observable<T> {
        return this.http
            .put(apiUrl + path + '/' + id, body)
            .map((response: Response) => {
                return <T>response.json();
            })
            .catch(this.handleError);
    }

    public delete<T>(path: string, id: string|number): Observable<T> {
        return this.http
            .delete(apiUrl + path + '/' + id)
            .map((response: Response) => {
                return <T>response.json();
            })
            .catch(this.handleError);
    }

    private handleError(error: Response) {
        return Observable.throw(error.statusText);
    }
}
