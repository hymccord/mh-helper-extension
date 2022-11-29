import {HornHud} from "@scripts/util/HornHud";

describe('HornHud', () => {
    describe('getTimerText', () => {
        it('returns time when not ready', () => {
            document.body.innerHTML = htmlHornData.hornWithTimer;
            expect(HornHud.getTimerText()).toBe('1:03');
        });

        it('returns Ready when ready', () => {
            document.body.innerHTML = htmlHornData.hornReady;
            expect(HornHud.getTimerText()).toBe('Ready');
        });

        it('legacy dom returns time when not ready', () => {
            document.body.innerHTML = htmlHornData.legacyHornWithTimer;
            expect(HornHud.getTimerText()).toBe('7:29');
        });

        it('legacy dom returns Ready when ready', () => {
            document.body.innerHTML = htmlHornData.legacyHornReady;
            expect(HornHud.getTimerText()).toBe('Ready');
        });
    });

    describe('canSoundHorn', () => {
        it('returns true when ready', () => {
            document.body.innerHTML = htmlHornData.hornReady;
            expect(HornHud.canSoundHorn()).toBe(true);
        });

        it('returns false when not ready', () => {
            document.body.innerHTML = htmlHornData.hornWithTimer;
            expect(HornHud.canSoundHorn()).toBe(false);
        });
    });

    describe('isPuzzleActive', () => {
        it('returns true when active and with timer', () => {
            document.body.innerHTML = htmlHornData.hornTimerWithKingsReward;
            expect(HornHud.isPuzzleActive()).toBe(true);
        });

        it('returns true when active and horn ready', () => {
            document.body.innerHTML = htmlHornData.hornReadyWithKingsReward;
            expect(HornHud.isPuzzleActive()).toBe(true);
        });

        it('returns false when not active', () => {
            document.body.innerHTML = htmlHornData.hornWithTimer;
            expect(HornHud.isPuzzleActive()).toBe(false);
        });

        it('returns true when active but false when solved', () => {
            document.body.innerHTML = htmlHornData.hornTimerWithKingsReward;
            expect(HornHud.isPuzzleActive()).toBe(true);

            // Solving the puzzle removes the 'huntersHornView__message--active' class from the 'huntersHornView__message' div node
            document.body.querySelector('.huntersHornView__message')!.classList.remove('huntersHornView__message--active');

            expect(HornHud.isPuzzleActive()).toBe(false);
        });
    });
});

const htmlHornData = {
    // Most of the elments have been trimmed to what is necessary to test
    // left: 1:03
    hornWithTimer: `
<div class="huntersHornView">
    <a class="huntersHornView__horn" href="https://www.mousehuntgame.com/turn.php" draggable="false" title="Sound the Hunter's Horn!"></a>
    <div class="huntersHornView__timer huntersHornView__timer--default countdown">
        <div class="huntersHornView__timerState huntersHornView__timerState--type-countdown huntersHornView__countdown">1:03</div>
        <div class="huntersHornView__timerState huntersHornView__timerState--type-ready">Ready</div>
    </div>
</div>
    `,
    hornReady: `
<div class="huntersHornView">
    <div class="huntersHornView__timer huntersHornView__timer--default ready">
        <div class="huntersHornView__timerState huntersHornView__timerState--type-countdown huntersHornView__countdown">0:01</div>
        <div class="huntersHornView__timerState huntersHornView__timerState--type-ready">Ready</div>
    </div>
</div>
    `,
    // left: 7:29
    legacyHornWithTimer: `
<div class="huntersHornView">
    <div class="huntersHornView__timer huntersHornView__timer--legacy countdown">
        <div class="huntersHornView__timerState huntersHornView__timerState--type-countdown huntersHornView__countdown">7:29</div>
        <div class="huntersHornView__timerState huntersHornView__timerState--type-ready">Ready</div>
    </div>
</div>
    `,
    legacyHornReady: `
<div class="huntersHornView">
    <div class="huntersHornView__timer huntersHornView__timer--legacy ready">
        <div class="huntersHornView__timerState huntersHornView__timerState--type-countdown huntersHornView__countdown">0:01</div>
        <div class="huntersHornView__timerState huntersHornView__timerState--type-ready">Ready</div>
    </div>
</div>
    `,
    // left: 0:55
    hornTimerWithKingsReward: `
<div class="huntersHornView">
    <div class="huntersHornView__messageContainer">
        <div class="huntersHornView__message huntersHornView__message--active">
            <div class="huntersHornMessageView huntersHornMessageView--puzzle">
                <div class="huntersHornMessageView__title">You have a King's Reward!</div>
                <div class="huntersHornMessageView__content">
                    <div class="huntersHornMessageView__text">You must claim a King's Reward before the hunt can continue.</div>
                    <div>
                        <button class="huntersHornMessageView__action">
                            <div class="huntersHornMessageView__actionLabel">
                                <span class="huntersHornMessageView__actionText">Claim</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="huntersHornView__timer huntersHornView__timer--default countdown">
        <div class="huntersHornView__timerState huntersHornView__timerState--type-countdown huntersHornView__countdown">0:54</div>
        <div class="huntersHornView__timerState huntersHornView__timerState--type-ready">Ready</div>
    </div>
</div>
    `,
    hornReadyWithKingsReward: `
<div class="huntersHornView">
    <div class="huntersHornView__messageContainer">
        <div class="huntersHornView__message huntersHornView__message--active">
            <div class="huntersHornMessageView huntersHornMessageView--puzzle">
                <div class="huntersHornMessageView__title">You have a King's Reward!</div>
                <div class="huntersHornMessageView__content">
                    <div class="huntersHornMessageView__text">You must claim a King's Reward before the hunt can continue.</div>
                    <div>
                        <button class="huntersHornMessageView__action">
                            <div class="huntersHornMessageView__actionLabel">
                                <span class="huntersHornMessageView__actionText">Claim</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="huntersHornView__timer huntersHornView__timer--default ready">
        <div class="huntersHornView__timerState huntersHornView__timerState--type-countdown huntersHornView__countdown">0:00</div>
        <div class="huntersHornView__timerState huntersHornView__timerState--type-ready">Ready</div>
    </div>
</div>
    `,
};
