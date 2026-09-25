// Jobs / Help — farmers can ask for help or offer work
const JOBS_KEY = 'ap_jobs_v1';

export const DEFAULT_JOBS = [
  { id: 1, type: 'need_help', title: 'Need 2 labourers for paddy transplanting', location: 'Mandya, Karnataka', date: 'Tomorrow', wage: '₹400/day', contact: 'Ramesh 98450 12345', description: '2 acre paddy field, need 2 people for 3 days', postedBy: 'Ramesh', time: Date.now() - 3600000*3 },
  { id: 2, type: 'offer_work', title: 'I can operate tractor & harvester', location: 'Pune, Maharashtra', date: 'Available now', wage: '₹500/day', contact: 'Suresh 94480 67890', description: '10 years experience, have own tractor license, can work in 20km radius', postedBy: 'Suresh', time: Date.now() - 3600000*6 },
  { id: 3, type: 'need_help', title: 'Need help with pesticide spraying', location: 'Nashik, Maharashtra', date: 'This week', wage: '₹350/day', contact: 'Anil 97310 54321', description: '5 acre grapes, need sprayer operator', postedBy: 'Anil', time: Date.now() - 3600000*12 },
  { id: 4, type: 'offer_work', title: 'Available for weeding & harvesting', location: 'Ludhiana, Punjab', date: 'This month', wage: '₹450/day', contact: 'Gurpreet 98150 11223', description: 'Family of 3, experienced in wheat & rice', postedBy: 'Gurpreet', time: Date.now() - 3600000*24 },
];

export function getJobs() {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    if (!raw) {
      localStorage.setItem(JOBS_KEY, JSON.stringify(DEFAULT_JOBS));
      return DEFAULT_JOBS;
    }
    return JSON.parse(raw);
  } catch { return DEFAULT_JOBS; }
}

export function addJob(job) {
  try {
    const jobs = getJobs();
    const newJob = { id: Date.now(), time: Date.now(), ...job };
    jobs.unshift(newJob);
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs.slice(0, 100)));
    return jobs;
  } catch { return getJobs(); }
}

export function deleteJob(id) {
  try {
    const jobs = getJobs().filter(j => j.id !== id);
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
    return jobs;
  } catch { return getJobs(); }
}
