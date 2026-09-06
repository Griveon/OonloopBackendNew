import { Document, Types } from "mongoose";

export interface IUserPreferenceValue {
    [key: string]: any;
}

export interface IUserPreference {
    user: Types.ObjectId;
    values: IUserPreferenceValue;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IUserPreferenceDocument extends IUserPreference, Document { }