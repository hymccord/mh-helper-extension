import {Quests, User} from "@scripts/types/hg";

type UserIdentification = Pick<User, 'user_id' | 'sn_user_id' | 'unique_hash' | 'has_shield'>;
type UserTurn = Pick<User, | 'num_active_turns' | 'next_activeturn_seconds'>
type UserEnvironment = Pick<User, 'environment_id' | 'environment_name'>;
type UserTrap = Pick<User, 'trap_power' |'trap_luck' |'trap_attraction_bonus' |'trap_power_bonus'>;
type UserWeapon = Pick<User, 'weapon_name' | 'weapon_item_id'>;
type UserBase = Pick<User, 'base_name' | 'base_item_id'>;
type UserBait = Pick<User, 'bait_name' | 'bait_item_id'>;
type UserTrinket = Pick<User, 'trinket_name' | 'trinket_item_id'>;

export class UserBuilder {
    identification: UserIdentification = {
        user_id: 1,
        sn_user_id: 2,
        unique_hash: 'hashbrowns',
        has_shield: true,
    };

    turn: UserTurn = {
        num_active_turns: 0,
        next_activeturn_seconds: 0,
    };

    environment: UserEnvironment = {
        environment_id: 9999,
        environment_name: 'Test Environment',
    };

    trap: UserTrap = {
        trap_power: 9001,
        trap_luck: 42,
        trap_attraction_bonus: 0.05,
        trap_power_bonus: 0.01,
    };

    weapon: UserWeapon = {
        weapon_name: 'TestWeapon Trap',
        weapon_item_id: 1111,
    };

    base: UserBase = {
        base_name: 'TestBase Base',
        base_item_id: 2222,
    };

    bait: UserBait = {
        bait_name: 'TestBait Cheese',
        bait_item_id: 3333,
    };

    trinket: UserTrinket = {
        trinket_name: 'TestTrinket Charm',
        trinket_item_id: 4444,
    };

    quests = {

    };

    public withIdentification(id: UserIdentification) {
        this.identification = id;
        return this;
    }

    public withTurn(turn: UserTurn) {
        this.turn = turn;
        return this;
    }

    public withEnvironment(environment: UserEnvironment) {
        this.environment = environment;
        return this;
    }

    public withTrap(trap: UserTrap) {
        this.trap = trap;
        return this;
    }

    public withWeapon(weapon: UserWeapon) {
        this.weapon = weapon;
        return this;
    }

    public withBase(base: UserBase) {
        this.base = base;
        return this;
    }

    public withBait(bait: UserBait) {
        this.bait = bait;
        return this;
    }

    public withTrinket(trinket: UserTrinket) {
        this.trinket = trinket;
        return this;
    }

    public withQuests(quests: Quests) {
        this.quests = quests;
        return this;
    }

    public build(): User {
        return {
            ...this.identification,
            ...this.turn,
            ...this.environment,
            ...this.trap,
            ...this.weapon,
            ...this.base,
            ...this.bait,
            ...this.trinket,
            quests: this.quests,
            viewing_atts: {},
        };
    }
}
