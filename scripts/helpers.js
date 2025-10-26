(function(){
  // Namespace setup
  window.App = window.App || {};

  // Storage helpers with namespacing
  const NS = 'mealprep-v1';
  const defaultData = { foods: [], plan: null, settings: { weeks: 4, includeDessert: true, startDate: null } };

  window.AppStorage = {
    get(key, fallback){
      try {
        const raw = localStorage.getItem(`${NS}:${key}`);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch(e){
        console.error('Storage get failed', e);
        return fallback;
      }
    },
    set(key, value){
      try {
        localStorage.setItem(`${NS}:${key}`, JSON.stringify(value));
      } catch(e){
        console.error('Storage set failed', e);
      }
    },
    loadAll(){
      const foods = this.get('foods', defaultData.foods);
      const plan = this.get('plan', defaultData.plan);
      const settings = this.get('settings', defaultData.settings);
      return { foods, plan, settings };
    },
    saveAll(data){
      if (data.foods) this.set('foods', data.foods);
      if (data.plan !== undefined) this.set('plan', data.plan);
      if (data.settings) this.set('settings', data.settings);
    }
  };

  // Utility helpers
  window.AppUtils = {
    uuid(){ return 'xxxxxxxx'.replace(/[x]/g, () => (Math.random()*16|0).toString(16)); },
    clone(obj){ return JSON.parse(JSON.stringify(obj)); },
    shuffle(arr){ const a = arr.slice(); for (let i=a.length-1; i>0; i--){ const j = Math.floor(Math.random()*(i+1)); [a[i], a[j]] = [a[j], a[i]];} return a; },
    sample(arr){ if (!arr || !arr.length) return null; return arr[Math.floor(Math.random()*arr.length)]; },
    formatDate(date){ const d = new Date(date); return d.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' }); },
    formatISO(date){ const d = new Date(date); const pad = (n)=> String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; },
    addDays(date, days){ const d = new Date(date); d.setDate(d.getDate()+days); return d; },
    weekIndexForOffset(offset){ return Math.floor(offset / 7); },
    pickFromPool(pool, recent, preferTags){
      if (!Array.isArray(pool) || pool.length === 0) return null;
      const maxRecent = 3;
      const recentSet = new Set(recent.slice(-maxRecent));
      let candidates = pool.filter(i => !recentSet.has(i.name));
      if (preferTags && preferTags.length){
        const preferred = candidates.filter(i => i.tags && i.tags.some(t => preferTags.includes(t)));
        if (preferred.length) candidates = preferred;
      }
      if (!candidates.length) candidates = pool; // allow repeat if necessary
      return this.sample(candidates);
    },
    toCSV(rows){
      const esc = (v)=> '"' + String(v).replace(/"/g,'""') + '"';
      return rows.map(r => r.map(esc).join(',')).join('\n');
    }
  };

  // Export helpers
  window.AppExport = {
    planToRows(plan, range, weekIndex){
      if (!plan || !Array.isArray(plan.days)) return [];
      const rows = [[ 'Date', 'Week', 'Day', 'Meal', 'Item' ]];
      const days = plan.days;
      const start = new Date(plan.startDate);
      const total = days.length;
      for (let i=0; i<total; i++){
        const wk = Math.floor(i/7) + 1;
        if (range === 'week' && wk !== (weekIndex+1)) continue;
        const date = window.AppUtils.addDays(start, i);
        const dateStr = window.AppUtils.formatISO(date);
        const d = days[i];
        const weekday = date.toLocaleDateString(undefined, { weekday:'long' });
        ['breakfast','lunch','dinner','dessert'].forEach(meal => {
          const item = d && d[meal] ? d[meal].name : '';
          rows.push([ dateStr, wk, weekday, meal, item ]);
        });
      }
      return rows;
    },
    downloadCSV(plan, range, weekIndex){
      const rows = this.planToRows(plan, range, weekIndex);
      const csv = window.AppUtils.toCSV(rows);
      const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = range === 'week' ? `-week-${weekIndex+1}` : '-month';
      a.download = `meal-plan${suffix}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Print helpers
  window.AppPrint = {
    printMonth(){
      window.requestAnimationFrame(() => {
        window.print();
      });
    },
    printWeek(weekIndex){
      const body = document.body;
      const cls = 'print-week';
      body.classList.add(cls);
      // Mark elements so CSS can scope
      const container = document.getElementById('view-week');
      if (container){
        container.querySelectorAll('[data-week]').forEach(el => {
          el.classList.remove('show-print-week-1','show-print-week-2','show-print-week-3','show-print-week-4');
        });
        const target = container.querySelector(`[data-week="${weekIndex+1}"]`);
        if (target) target.classList.add(`show-print-week-${weekIndex+1}`);
      }
      window.requestAnimationFrame(() => {
        window.print();
        setTimeout(() => body.classList.remove(cls), 300);
      });
    }
  };
})();
