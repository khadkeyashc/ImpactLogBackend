const { Badge, UserBadge, PointsLedger } = require('../models/Associations');

class PointsService {
  /**
   * Give rewards (points + optional badge) to selected users
   */
  static async giveRewardsToUsers(selectedUsers, eventId, points, badge_id , badge_name ) {
    try {
      console.log(selectedUsers, eventId, points, badge_id, badge_name)
      for (const userId of selectedUsers) {
        // 1. Award points
        await this.awardPoints(userId, points, eventId, `Reward for participating in event ${eventId}`);

        // 2. Award badge (if provided)
        if (badge_id) {
          const existingBadge = await UserBadge.findOne({ where: { userId, badgeId: badge_id } });
          if (!existingBadge) {
            console.log("AWARDING")
            await UserBadge.create({
              userId,
              badgeId: badge_id,
            });
          }
        }
      }

      return { success: true, message: "Rewards successfully given to selected users." };
    } catch (error) {
      console.error("Error in giveRewardsToUsers:", error);
      throw new Error("Failed to give rewards to users");
    }
  }

  /**
   * Get all badges from DB
   */
  static async getBadgesFromDb() {
    return await Badge.findAll();
  }

  /**
   * Award points to a user
   */
  static async awardPoints(userId, points, source, reason = null) {
    const ledgerEntry = await PointsLedger.create({
      userId,
      points,
      source,
      reason,
    });

    // Check for badge eligibility
    await this.evaluateBadges(userId);

    return ledgerEntry;
  }

  /**
   * Evaluate badges for a user based on points or event count
   */
  static async evaluateBadges(userId) {
    const badges = await Badge.findAll();
    const userPoints = await PointsLedger.sum('points', { where: { userId } }) || 0;
    const userBadgeIds = (await UserBadge.findAll({ where: { userId } })).map(b => b.badgeId);

    for (const badge of badges) {
      if (userBadgeIds.includes(badge.id)) continue;

      const criteria = badge.criteria; // JSON: { type: 'points', value: 100 }
      let eligible = false;

      if (criteria.type === 'points' && userPoints >= criteria.value) eligible = true;
      if (criteria.type === 'event_count') {
        const eventCount = await PointsLedger.count({
          where: { userId, source: criteria.sourceType || null }
        });
        if (eventCount >= criteria.value) eligible = true;
      }

      if (eligible) {
        await UserBadge.create({
          userId,
          badgeId: badge.id,
        });
      }
    }
  }

  /**
   * Get user's points
   */
  static async getUserPoints(userId) {
    return await PointsLedger.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Get user's badges
   */
  static async getUserBadges(userId) {
    return await UserBadge.findAll({
      where: { userId },
      include: [{ model: Badge, as: 'badge' }],
    });
  }

  /**
   * Leaderboard (based on points)
   */
  static async getLeaderboard(limit = 10) {
    return await PointsLedger.findAll({
      attributes: [
        'userId',
        [PointsLedger.sequelize.fn('SUM', PointsLedger.sequelize.col('points')), 'totalPoints'],
      ],
      group: ['userId'],
      order: [[PointsLedger.sequelize.literal('totalPoints'), 'DESC']],
      limit,
    });
  }
}

module.exports = PointsService;
