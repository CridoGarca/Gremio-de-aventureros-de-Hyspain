import { InjectionToken } from '@angular/core';
import { Firestore } from 'firebase/firestore';

export const FIRESTORE_TOKEN = new InjectionToken<Firestore>('FIRESTORE');
