import { FeatureModel } from "../modules/feature/models/feature.model.js";
import { PlanFeatureModel } from "../modules/planfeature/models/planfeature.model.js";
import { WorkspaceSubscriptionModel } from "../modules/workspacesubscription/models/workspacesubscription.model.js";

export class FeatureAccessUtil {

    async getFeatureValue(userId: string, featureKey: string) {

        const subscription = await WorkspaceSubscriptionModel.findOne({
            user: userId,
            isActive: true,
            status: "active",
        });

        if (!subscription) {
            throw new Error("No active subscription found");
        }


        const feature = await FeatureModel.findOne({ key: featureKey, isActive: true });
        if (!feature) throw new Error("Feature not found");


        const planFeature = await PlanFeatureModel.findOne({
            plan: subscription.plan,
            feature: feature._id,
            isActive: true,
        });

        if (!planFeature) {
            throw new Error(`Feature not configured for this plan`);
        }

        return planFeature.value;
    }
}