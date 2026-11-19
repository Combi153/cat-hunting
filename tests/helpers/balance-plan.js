// An omniscient route planner: a lower bound on physical feasibility, not a player model.
import { Exam } from '../../src/session.js';
import { Room } from '../../src/world.js';
import { Vector3 } from 'three';
import { PROCTOR_HOME } from '../../src/walkways.js';

const travelByLayout = new Map();
for (const stage of [1, 3]) {
  const exam = new Exam(42, stage);
  const travel = new Map();
  for (const seat of exam.seats) {
    const room = Object.create(Room.prototype);
    room.session = exam;
    room.proctor = { position: new Vector3(0, 0, PROCTOR_HOME.z), rotation: { y: Math.PI } };
    room.path = [];
    room.select(seat.id);
    let outward = 0;
    while (room.busy && outward < 10) { room.step(1 / 60); outward += 1 / 60; }
    room.step(0.5);
    room.returnHome();
    let back = 0;
    while (room.busy && back < 10) { room.step(1 / 60); back += 1 / 60; }
    travel.set(seat.id, { out: outward, back });
  }
  travelByLayout.set(exam.seats.length, travel);
}
function orders(items) {
  return items.length
    ? items.flatMap((item, i) => orders(items.filter((_, j) => i !== j)).map(rest => [item, ...rest]))
    : [[]];
}
export function bestPlan(exam) {
  const travel = travelByLayout.get(exam.seats.length);
  let best = null;
  for (const order of orders(exam.seats.filter(s => s.guilty))) {
    let time = 0;
    const visits = [];
    for (const seat of order) {
      const { out, back } = travel.get(seat.id);
      // Allow the arrival reaction plus 0.4 seconds to recognize the visible prop.
      let at = time + out + exam.rules.hide + 0.4;
      const phase = (at - seat.first + seat.period * 100) % seat.period;
      if (at < seat.first + exam.rules.cue + 0.4) at = seat.first + exam.rules.cue + 0.4;
      else if (phase < exam.rules.cue + 0.4) at += exam.rules.cue + 0.4 - phase;
      else if (phase > exam.rules.cue + exam.rules.proof - 0.15)
        at += seat.period - phase + exam.rules.cue + 0.4;
      visits.push({ id: seat.id, depart: at - out - exam.rules.hide - 0.4, report: at });
      time = at + back;
    }
    const finish = visits.at(-1).report;
    if (!best || finish < best.finish) best = { finish, visits };
  }
  return best;
}
