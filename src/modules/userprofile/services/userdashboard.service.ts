import { UserDashboardRepository } from "../repositories/userdashboard.repository.js";

export class UserDashboardService {

    private repo: UserDashboardRepository;

    constructor() {
        this.repo = new UserDashboardRepository();
    }

    async getDashboard(userId: string) {

        const [
            profile,
            wishlist,
            cart,
            orderStats,
            recentOrders
        ] = await Promise.all([
            this.repo.getProfile(userId),
            this.repo.getWishlist(userId),
            this.repo.getCart(userId),
            this.repo.getOrderStats(userId),
            this.repo.getRecentOrders(userId),
        ]);

        if (!profile) {
            throw new Error("Profile not found");
        }

        return {
            stats: {
                orders: orderStats.orderCount,
                wishlist: wishlist?.items?.length || 0,
                cart: cart?.items?.length || 0,
                totalSpend: orderStats.totalSpend,
            },
        };
    }
}