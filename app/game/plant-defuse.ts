import {
  DRAX_DOCKS_LAYOUT,
  type BombsiteDefinition,
  type BombsiteId,
  type CompetitiveSide,
  type Team,
} from './maps';

export type PlantDefusePhase = 'prep' | 'live' | 'bomb-planted' | 'round-end';
export type RoundWinnerReason =
  | 'attackers-eliminated-defenders'
  | 'defenders-eliminated-attackers'
  | 'round-time-expired'
  | 'bomb-exploded'
  | 'bomb-defused';

export type BombPosition = { x: number; y: number; z: number };
export type BombState =
  | { status: 'carried'; carrierId: string }
  | { status: 'dropped'; position: BombPosition }
  | {
      status: 'planted';
      siteId: BombsiteId;
      position: BombPosition;
      explosionDeadline: number;
    }
  | { status: 'defused'; siteId: BombsiteId }
  | { status: 'exploded'; siteId: BombsiteId };

export const PLANT_DEFUSE_RULES = {
  freezeTime: 6,
  roundTime: 105,
  plantTime: 4,
  bombTime: 40,
  defuseTime: 7,
  roundEndDelay: 4,
  roundsPerHalf: 6,
  roundsToWin: 7,
  grenadesPerRound: 1,
  maxOvertimeSets: 3,
} as const;

export type PlantDefuseRules = typeof PLANT_DEFUSE_RULES;

export type PlantDefuseSnapshot = {
  roundPhase: PlantDefusePhase;
  roundNumber: number;
  half: number;
  overtimeSet: number;
  overtimeRound: number;
  viperSide: CompetitiveSide;
  ravenSide: CompetitiveSide;
  roundTimeRemaining: number;
  bombTimeRemaining: number;
  bombState: BombState;
  viperScore: number;
  ravenScore: number;
  roundWinner: Team | null;
  roundWinnerReason: RoundWinnerReason | null;
  matchWinner: Team | null;
  draw: boolean;
  complete: boolean;
};

type ActivePlant = {
  actorId: string;
  actorTeam: Team;
  siteId: BombsiteId;
  startedAt: number;
  start: BombPosition;
};

type ActiveDefuse = {
  actorId: string;
  actorTeam: Team;
  startedAt: number;
};

/** Pure Plant/Defuse rules. No Three.js or DOM state lives here. */
export class PlantDefuseMatch {
  readonly rules: PlantDefuseRules;
  readonly sites: readonly BombsiteDefinition[];
  elapsed = 0;
  roundPhase: PlantDefusePhase = 'prep';
  roundNumber = 1;
  overtimeSet = 0;
  overtimeRound = 0;
  roundTimeRemaining: number;
  bombTimeRemaining = 0;
  phaseTimeRemaining: number;
  liveDeadline = Infinity;
  bombState: BombState = { status: 'carried', carrierId: 'unassigned' };
  viperScore = 0;
  ravenScore = 0;
  roundWinner: Team | null = null;
  roundWinnerReason: RoundWinnerReason | null = null;
  matchWinner: Team | null = null;
  draw = false;
  complete = false;
  roundScored = false;
  pendingOutcome: Team | 'draw' | null = null;
  overtimeSetStart = { viper: 0, raven: 0 };
  activePlant: ActivePlant | null = null;
  activeDefuse: ActiveDefuse | null = null;

  constructor(
    rules: PlantDefuseRules = PLANT_DEFUSE_RULES,
    sites: readonly BombsiteDefinition[] = DRAX_DOCKS_LAYOUT.bombsites,
  ) {
    this.rules = rules;
    this.sites = sites;
    this.roundTimeRemaining = rules.roundTime;
    this.phaseTimeRemaining = rules.freezeTime;
  }

  get half() {
    if (this.overtimeSet > 0) return 3;
    return this.roundNumber <= this.rules.roundsPerHalf ? 1 : 2;
  }

  sideForTeam(team: Team): CompetitiveSide {
    const viperAttacks =
      this.overtimeSet > 0
        ? this.overtimeRound === 1
        : this.roundNumber <= this.rules.roundsPerHalf;
    if (team === 'viper') return viperAttacks ? 'attackers' : 'defenders';
    return viperAttacks ? 'defenders' : 'attackers';
  }

  teamForSide(side: CompetitiveSide): Team {
    return this.sideForTeam('viper') === side ? 'viper' : 'raven';
  }

  beginRound(carrierId = 'unassigned') {
    this.roundPhase = 'prep';
    this.phaseTimeRemaining = this.rules.freezeTime;
    this.roundTimeRemaining = this.rules.roundTime;
    this.bombTimeRemaining = 0;
    this.liveDeadline = Infinity;
    this.bombState = { status: 'carried', carrierId };
    this.roundWinner = null;
    this.roundWinnerReason = null;
    this.roundScored = false;
    this.activePlant = null;
    this.activeDefuse = null;
  }

  assignBombCarrier(carrierId: string, actorTeam?: Team) {
    if (this.roundPhase !== 'prep' && this.roundPhase !== 'live') return false;
    if (actorTeam && this.sideForTeam(actorTeam) !== 'attackers') return false;
    if (this.bombState.status === 'planted') return false;
    this.bombState = { status: 'carried', carrierId };
    this.activePlant = null;
    return true;
  }

  dropBomb(position: BombPosition, carrierId?: string) {
    if (this.bombState.status !== 'carried') return false;
    if (carrierId && this.bombState.carrierId !== carrierId) return false;
    this.bombState = { status: 'dropped', position: { ...position } };
    this.activePlant = null;
    return true;
  }

  pickupBomb(carrierId: string, actorTeam?: Team) {
    if (this.roundPhase !== 'live' || this.bombState.status !== 'dropped') return false;
    if (actorTeam && this.sideForTeam(actorTeam) !== 'attackers') return false;
    this.bombState = { status: 'carried', carrierId };
    this.activePlant = null;
    return true;
  }

  siteContains(
    siteId: BombsiteId,
    x: number,
    z: number,
    radius = 0,
    feetY = 0,
  ) {
    const site = this.sites.find((candidate) => candidate.id === siteId);
    if (!site) return false;
    const { bounds } = site;
    if (bounds.minY !== undefined && feetY < bounds.minY - 0.05) return false;
    if (bounds.maxY !== undefined && feetY > bounds.maxY + 0.05) return false;
    return (
      x >= bounds.minX + radius &&
      x <= bounds.maxX - radius &&
      z >= bounds.minZ + radius &&
      z <= bounds.maxZ - radius
    );
  }

  beginPlant(
    actorId: string,
    actorTeam: Team,
    siteId: BombsiteId,
    actorPosition: BombPosition,
    startedAt = this.elapsed,
    actorRadius = 0.32,
  ) {
    if (this.roundPhase !== 'live') return false;
    if (this.sideForTeam(actorTeam) !== 'attackers') return false;
    if (this.bombState.status !== 'carried' || this.bombState.carrierId !== actorId)
      return false;
    if (
      !this.siteContains(
        siteId,
        actorPosition.x,
        actorPosition.z,
        actorRadius,
        actorPosition.y,
      )
    )
      return false;
    if (startedAt > this.liveDeadline) return false;
    this.activePlant = {
      actorId,
      actorTeam,
      siteId,
      startedAt,
      start: { ...actorPosition },
    };
    return true;
  }

  cancelPlant(actorId?: string) {
    if (!this.activePlant) return false;
    if (actorId && this.activePlant.actorId !== actorId) return false;
    this.activePlant = null;
    return true;
  }

  completePlantInteraction(
    actorId: string,
    actorTeam: Team,
    position: BombPosition,
    completedAt = this.elapsed,
    actorRadius = 0.32,
    movementTolerance = 0.22,
  ) {
    const active = this.activePlant;
    if (!active || active.actorId !== actorId || active.actorTeam !== actorTeam) return false;
    if (completedAt - active.startedAt + 1e-6 < this.rules.plantTime) return false;
    if (
      Math.hypot(position.x - active.start.x, position.z - active.start.z) > movementTolerance ||
      Math.abs(position.y - active.start.y) > 0.08
    ) {
      this.activePlant = null;
      return false;
    }
    if (!this.siteContains(active.siteId, position.x, position.z, actorRadius, position.y)) {
      this.activePlant = null;
      return false;
    }
    const site = this.sites.find((candidate) => candidate.id === active.siteId);
    const nearest = site?.plantSpots.reduce(
      (best, spot) =>
        Math.hypot(spot.x - position.x, spot.z - position.z) <
        Math.hypot(best.x - position.x, best.z - position.z)
          ? spot
          : best,
      site.plantSpots[0],
    );
    this.activePlant = null;
    return this.completePlant(
      active.siteId,
      { x: nearest?.x ?? position.x, y: 0.12, z: nearest?.z ?? position.z },
      completedAt,
    );
  }

  completePlant(siteId: BombsiteId, position: BombPosition, completedAt = this.elapsed) {
    if (
      this.roundPhase !== 'live' ||
      this.bombState.status !== 'carried' ||
      completedAt > this.liveDeadline
    )
      return false;
    const explosionDeadline = completedAt + this.rules.bombTime;
    this.bombState = {
      status: 'planted',
      siteId,
      position: { ...position },
      explosionDeadline,
    };
    this.roundPhase = 'bomb-planted';
    this.roundTimeRemaining = Math.max(0, this.liveDeadline - completedAt);
    this.bombTimeRemaining = this.rules.bombTime;
    this.activePlant = null;
    this.activeDefuse = null;
    return true;
  }

  beginDefuse(actorId: string, actorTeam: Team, startedAt = this.elapsed) {
    if (this.roundPhase !== 'bomb-planted' || this.bombState.status !== 'planted')
      return false;
    if (this.sideForTeam(actorTeam) !== 'defenders') return false;
    if (startedAt > this.bombState.explosionDeadline) return false;
    this.activeDefuse = { actorId, actorTeam, startedAt };
    return true;
  }

  cancelDefuse(actorId?: string) {
    if (!this.activeDefuse) return false;
    if (actorId && this.activeDefuse.actorId !== actorId) return false;
    this.activeDefuse = null;
    return true;
  }

  completeDefuse(
    completedAt = this.elapsed,
    actorId?: string,
    actorTeam?: Team,
  ) {
    if (this.roundPhase !== 'bomb-planted' || this.bombState.status !== 'planted')
      return false;
    const planted = this.bombState;
    if (completedAt > planted.explosionDeadline) {
      this.activeDefuse = null;
      this.explodeBomb(planted.siteId);
      return false;
    }
    if (actorId || actorTeam || this.activeDefuse) {
      const active = this.activeDefuse;
      if (!active) return false;
      if (actorId && active.actorId !== actorId) return false;
      if (actorTeam && (active.actorTeam !== actorTeam || this.sideForTeam(actorTeam) !== 'defenders'))
        return false;
      if (completedAt - active.startedAt + 1e-6 < this.rules.defuseTime) return false;
    }
    this.activeDefuse = null;
    this.bombState = { status: 'defused', siteId: planted.siteId };
    this.endRound(this.teamForSide('defenders'), 'bomb-defused');
    return true;
  }

  evaluateEliminations(aliveAttackers: number, aliveDefenders: number) {
    if (this.roundPhase === 'live') {
      if (aliveDefenders <= 0) {
        this.endRound(this.teamForSide('attackers'), 'attackers-eliminated-defenders');
        return true;
      }
      if (aliveAttackers <= 0) {
        this.endRound(this.teamForSide('defenders'), 'defenders-eliminated-attackers');
        return true;
      }
    } else if (this.roundPhase === 'bomb-planted' && aliveDefenders <= 0) {
      this.endRound(this.teamForSide('attackers'), 'attackers-eliminated-defenders');
      return true;
    }
    return false;
  }

  endRound(winner: Team, reason: RoundWinnerReason) {
    if (this.roundPhase === 'round-end' || this.complete || this.roundScored) return false;
    this.roundScored = true;
    this.roundWinner = winner;
    this.roundWinnerReason = reason;
    if (winner === 'viper') this.viperScore++;
    else this.ravenScore++;
    this.roundPhase = 'round-end';
    this.phaseTimeRemaining = this.rules.roundEndDelay;
    this.activePlant = null;
    this.activeDefuse = null;

    if (this.overtimeSet === 0) {
      if (this.viperScore >= this.rules.roundsToWin) this.pendingOutcome = 'viper';
      else if (this.ravenScore >= this.rules.roundsToWin) this.pendingOutcome = 'raven';
    } else if (this.overtimeRound === 2) {
      const viperDelta = this.viperScore - this.overtimeSetStart.viper;
      const ravenDelta = this.ravenScore - this.overtimeSetStart.raven;
      if (viperDelta === 2) this.pendingOutcome = 'viper';
      else if (ravenDelta === 2) this.pendingOutcome = 'raven';
      else if (this.overtimeSet >= this.rules.maxOvertimeSets) this.pendingOutcome = 'draw';
    }
    return true;
  }

  private explodeBomb(siteId: BombsiteId) {
    if (this.roundPhase !== 'bomb-planted') return false;
    this.bombState = { status: 'exploded', siteId };
    this.bombTimeRemaining = 0;
    this.endRound(this.teamForSide('attackers'), 'bomb-exploded');
    return true;
  }

  private advanceAfterRoundEnd() {
    if (this.pendingOutcome) {
      if (this.pendingOutcome === 'draw') this.draw = true;
      else this.matchWinner = this.pendingOutcome;
      this.complete = true;
      return;
    }

    if (this.overtimeSet > 0) {
      if (this.overtimeRound === 1) {
        this.overtimeRound = 2;
        this.roundNumber++;
        this.beginRound();
        return;
      }
      this.overtimeSet++;
      this.overtimeRound = 1;
      this.overtimeSetStart = { viper: this.viperScore, raven: this.ravenScore };
      this.roundNumber++;
      this.beginRound();
      return;
    }

    if (
      this.roundNumber === this.rules.roundsPerHalf * 2 &&
      this.viperScore === this.rules.roundsPerHalf &&
      this.ravenScore === this.rules.roundsPerHalf
    ) {
      this.overtimeSet = 1;
      this.overtimeRound = 1;
      this.overtimeSetStart = { viper: this.viperScore, raven: this.ravenScore };
      this.roundNumber++;
      this.beginRound();
      return;
    }

    this.roundNumber++;
    this.beginRound();
  }

  tick(dt: number) {
    if (this.complete || dt <= 0) return;
    this.elapsed += dt;

    if (this.roundPhase === 'prep') {
      this.phaseTimeRemaining = Math.max(0, this.phaseTimeRemaining - dt);
      if (this.phaseTimeRemaining <= 0) {
        this.roundPhase = 'live';
        this.roundTimeRemaining = this.rules.roundTime;
        this.liveDeadline = this.elapsed + this.rules.roundTime;
      }
      return;
    }

    if (this.roundPhase === 'live') {
      this.roundTimeRemaining = Math.max(0, this.liveDeadline - this.elapsed);
      if (this.elapsed >= this.liveDeadline) {
        this.cancelPlant();
        this.endRound(this.teamForSide('defenders'), 'round-time-expired');
      }
      return;
    }

    if (this.roundPhase === 'bomb-planted' && this.bombState.status === 'planted') {
      this.bombTimeRemaining = Math.max(0, this.bombState.explosionDeadline - this.elapsed);
      if (this.elapsed >= this.bombState.explosionDeadline) {
        this.cancelDefuse();
        this.explodeBomb(this.bombState.siteId);
      }
      return;
    }

    if (this.roundPhase === 'round-end') {
      this.phaseTimeRemaining = Math.max(0, this.phaseTimeRemaining - dt);
      if (this.phaseTimeRemaining <= 0) this.advanceAfterRoundEnd();
    }
  }

  snapshot(): PlantDefuseSnapshot {
    return {
      roundPhase: this.roundPhase,
      roundNumber: this.roundNumber,
      half: this.half,
      overtimeSet: this.overtimeSet,
      overtimeRound: this.overtimeRound,
      viperSide: this.sideForTeam('viper'),
      ravenSide: this.sideForTeam('raven'),
      roundTimeRemaining: this.roundTimeRemaining,
      bombTimeRemaining: this.bombTimeRemaining,
      bombState: this.bombState,
      viperScore: this.viperScore,
      ravenScore: this.ravenScore,
      roundWinner: this.roundWinner,
      roundWinnerReason: this.roundWinnerReason,
      matchWinner: this.matchWinner,
      draw: this.draw,
      complete: this.complete,
    };
  }
}
