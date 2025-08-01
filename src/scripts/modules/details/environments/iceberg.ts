import {User, JournalMarkup, QuestIceberg} from "@scripts/types/hg";
import {IntakeMessage} from "@scripts/types/mhct";
import {IEnvironmentDetailer} from "../details.types";

export class AugerBotAmbientIcebergDetailer implements IEnvironmentDetailer {
    readonly environment = 'Iceberg';

    addDetails(message: IntakeMessage, userPre: User, userPost: User, journal: JournalMarkup): object | undefined {
        this.assertIceberg(userPost);

        if (userPost.weapon_name !== 'Steam AugerBot 3000')
        {
            return;
        }

        if (
            journal.render_data.css_class.includes('chesla_trap_trigger') &&
            journal.render_data.text.includes('distance traveled was doubled')
        ) {
            return {
                steam_augerbot_trigger: true,
            };
        }
    }

    private assertIceberg(user: User): asserts user is User & { quests: QuestIceberg } {
        if (!('QuestIceberg' in user.quests)) {
            throw new Error('User is not on the Iceberg quest');
        }
    }
}

/* journal example
{
    "render_data": {
        "image": [],
        "entry_id": 287044,
        "mouse_type": false,
        "css_class": "entry short misc custom chesla_trap_trigger minimalJournal",
        "entry_date": "3:02pm",
        "environment": "Iceberg",
        "is_highlight": false,
        "entry_timestamp": 1754074936,
        "text": "My Steam AugerBot 3000 gripped the icy walls to provide incredible traction! My distance traveled was doubled."
    }
}
*/
