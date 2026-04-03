import { Document, Types } from "mongoose";

export interface IWorkspace {
    name: string;
    description?: string;
    owner: Types.ObjectId;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IWorkspaceDocument extends IWorkspace, Document { }