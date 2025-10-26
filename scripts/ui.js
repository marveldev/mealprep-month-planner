(function($){
  // Ensure namespace
  window.App = window.App || {};

  // Default suggestion packs
  const SUGGESTIONS = [
    { name:'Greek yogurt parfait', mealTypes:['breakfast'], tags:['protein','sweet'] },
    { name:'Spinach omelet', mealTypes:['breakfast'], tags:['protein','veggie'] },
    { name:'Avocado toast', mealTypes:['breakfast'], tags:['carb'] },
    { name:'Overnight oats', mealTypes:['breakfast'], tags:['carb','sweet'] },
    { name:'Quinoa salad bowl', mealTypes:['lunch'], tags:['veggie','protein'] },
    { name:'Turkey sandwich', mealTypes:['lunch'], tags:['protein','carb'] },
    { name:'Soba noodle salad', mealTypes:['lunch'], tags:['carb','veggie'] },
    { name:'Chicken Caesar wrap', mealTypes:['lunch'], tags:['protein'] },
    { name:'Baked salmon with rice', mealTypes:['dinner'], tags:['protein','carb'] },
    { name:'Veggie stir-fry', mealTypes:['dinner'], tags:['veggie'] },
    { name:'Beef tacos', mealTypes:['dinner'], tags:['protein','carb'] },
    { name:'Pasta primavera', mealTypes:['dinner'], tags:['carb','veggie'] },
  ];

  const DEFAULT_DESSERTS = [
    { name:'Dark chocolate square', mealTypes:['dessert'], tags:['sweet'] },
    { name:'Fruit salad', mealTypes:['dessert'], tags:['fruit','sweet'] },
    { name:'Yogurt with honey', mealTypes:['dessert'], tags:['sweet','protein'] },
    { name:'Cinnamon baked apples', mealTypes:['dessert'], tags:['fruit','sweet'] },
    { name:'Banana nice cream', mealTypes:['dessert'], tags:['fruit','sweet'] },
    { name:'Chia pudding', mealTypes:['dessert'], tags:['sweet','protein'] },
  ];

  // App state
  const state = {
    foods: [],
    plan: null,
    settings: { weeks: 4, includeDessert: true, startDate: null },
    ui: { activeView: 'month', activeWeek: 0 }
  };

  // Toast
  function showToast(msg){
    const $t = $('#toast');
    $t.find('div').text(msg || 'Saved');
    $t.removeClass('hidden').addClass('show');
    setTimeout(() => $t.addClass('hidden').removeClass('show'), 2400);
  }

  // Load and save
  function load(){
    const all = window.AppStorage.loadAll();
    state.foods = Array.isArray(all.foods) ? all.foods : [];
    state.plan = all.plan || null;
    state.settings = Object.assign({}, state.settings, all.settings || {});
    if (!state.settings.startDate){
      const todayISO = window.AppUtils.formatISO(new Date());
      state.settings.startDate = todayISO;
    }
  }
  function save(){
    window.AppStorage.saveAll({ foods: state.foods, plan: state.plan, settings: state.settings });
  }

  // Food management
  function addFood(food){
    const item = Object.assign({ id: window.AppUtils.uuid(), name:'', mealTypes:[], tags:[] }, food);
    state.foods.push(item);
    save();
    renderFoodList();
    showToast('Food added');
  }
  function removeFood(id){
    state.foods = state.foods.filter(f => f.id !== id);
    save();
    renderFoodList();
  }

  // Plan generation
  function getPools(includeDessert){
    const foods = state.foods;
    const pool = {
      breakfast: foods.filter(f => f.mealTypes.includes('breakfast')),
      lunch: foods.filter(f => f.mealTypes.includes('lunch')),
      dinner: foods.filter(f => f.mealTypes.includes('dinner')),
      dessert: foods.filter(f => f.mealTypes.includes('dessert')),
    };
    if (includeDessert){
      if (pool.dessert.length === 0){
        pool.dessert = DEFAULT_DESSERTS.map(x => Object.assign({}, x, { id: x.name.toLowerCase().replace(/\s+/g,'-') }));
      }
    } else {
      pool.dessert = [];
    }
    return pool;
  }

  function generateMonthPlan(){
    const weeks = parseInt(state.settings.weeks, 10) || 4;
    const totalDays = weeks * 7;
    const includeDessert = !!state.settings.includeDessert;
    const pools = getPools(includeDessert);
    const startDate = new Date(state.settings.startDate || new Date());
    const days = [];

    const recents = { breakfast:[], lunch:[], dinner:[], dessert:[] };

    for (let i=0; i<totalDays; i++){
      const date = window.AppUtils.addDays(startDate, i);
      const day = {};
      day.date = window.AppUtils.formatISO(date);
      // Pickers with simple balancing preferences
      day.breakfast = window.AppUtils.pickFromPool(pools.breakfast, recents.breakfast, ['protein','carb']) || null;
      if (day.breakfast) recents.breakfast.push(day.breakfast.name);

      day.lunch = window.AppUtils.pickFromPool(pools.lunch, recents.lunch, ['protein','veggie']) || null;
      if (day.lunch) recents.lunch.push(day.lunch.name);

      day.dinner = window.AppUtils.pickFromPool(pools.dinner, recents.dinner, ['protein','veggie']) || null;
      if (day.dinner) recents.dinner.push(day.dinner.name);

      day.dessert = includeDessert ? (window.AppUtils.pickFromPool(pools.dessert, recents.dessert, ['sweet','fruit']) || null) : null;
      if (day.dessert) recents.dessert.push(day.dessert.name);

      days.push(day);
    }

    state.plan = { startDate: window.AppUtils.formatISO(startDate), days };
    save();
    renderPlanner();
    showToast('Month plan generated');
  }

  function regenerateWeek(weekIndex){
    if (!state.plan || !state.plan.days) return generateMonthPlan();
    const includeDessert = !!state.settings.includeDessert;
    const pools = getPools(includeDessert);
    const startDate = new Date(state.plan.startDate);
    const start = weekIndex * 7;
    const end = start + 7;
    const days = state.plan.days;

    // Gather recent history window for balancing
    const recents = { breakfast:[], lunch:[], dinner:[], dessert:[] };
    // Look back up to 3 days from the start of this week
    const lookBackStart = Math.max(0, start - 3);
    for (let i = lookBackStart; i < start; i++){
      const d = days[i];
      if (!d) continue;
      ['breakfast','lunch','dinner','dessert'].forEach(m => { if (d[m]) recents[m].push(d[m].name); });
    }

    for (let i=start; i<end; i++){
      const date = window.AppUtils.addDays(startDate, i);
      const d = days[i] || { date: window.AppUtils.formatISO(date) };
      d.breakfast = window.AppUtils.pickFromPool(pools.breakfast, recents.breakfast, ['protein','carb']) || null;
      if (d.breakfast) recents.breakfast.push(d.breakfast.name);

      d.lunch = window.AppUtils.pickFromPool(pools.lunch, recents.lunch, ['protein','veggie']) || null;
      if (d.lunch) recents.lunch.push(d.lunch.name);

      d.dinner = window.AppUtils.pickFromPool(pools.dinner, recents.dinner, ['protein','veggie']) || null;
      if (d.dinner) recents.dinner.push(d.dinner.name);

      d.dessert = includeDessert ? (window.AppUtils.pickFromPool(pools.dessert, recents.dessert, ['sweet','fruit']) || null) : null;
      if (d.dessert) recents.dessert.push(d.dessert.name);

      days[i] = d;
    }

    save();
    renderPlanner();
    showToast(`Week ${weekIndex+1} regenerated`);
  }

  // Rendering
  function renderFoodList(){
    const $list = $('#food-list');
    $list.empty();
    if (!state.foods.length){
      $list.append($('<div class="text-sm text-slate-500">No foods yet. Add a few or pick from suggestions below.</div>'));
      return;
    }
    state.foods.forEach(f => {
      const $row = $(`
        <div class="food-item" data-id="${f.id}">
          <div>
            <div class="food-name">${$('<div>').text(f.name).html()}</div>
            <div class="food-meta">
              <span>${f.mealTypes.join(', ') || 'meal'}</span>
              ${f.tags && f.tags.length ? `<span>• ${f.tags.join(', ')}</span>` : ''}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn-secondary text-xs px-2 py-1 edit">Edit</button>
            <button class="btn-danger text-xs px-2 py-1 remove">Delete</button>
          </div>
        </div>
      `);
      $row.find('button.remove').on('click', function(){ removeFood(f.id); });
      $row.find('button.edit').on('click', function(){ openEditFood(f); });
      $list.append($row);
    });
  }

  function openEditFood(food){
    // Simple inline edit using prompt for brevity and reliability
    const name = window.prompt('Rename food', food.name);
    if (name && name.trim()){
      food.name = name.trim();
      save();
      renderFoodList();
      renderPlanner();
      showToast('Food updated');
    }
  }

  function renderSuggestions(){
    const $host = $('#suggestions');
    $host.empty();
    const more = window.AppUtils.shuffle(SUGGESTIONS).slice(0, 10);
    more.forEach(s => {
      const $b = $(`<button class="chip hover:bg-slate-900/10" title="Add to library">${$('<div>').text(s.name).html()}</button>`);
      $b.on('click', () => addFood(s));
      $host.append($b);
    });
  }

  function renderPlanner(){
    const $month = $('#view-month');
    const $week = $('#view-week');
    $month.empty();
    $week.empty();

    if (!state.plan || !state.plan.days || !state.plan.days.length){
      $month.append('<div class="text-sm text-slate-500">No plan yet. Click Generate month to create your plan.</div>');
      $week.append('<div class="text-sm text-slate-500">No plan yet. Click Generate month to create your plan.</div>');
      return;
    }

    const days = state.plan.days;
    const startDate = new Date(state.plan.startDate);

    // Month grid
    const $grid = $('<div class="plan-grid"></div>');
    for (let i=0; i<days.length; i++){
      const d = days[i];
      const date = window.AppUtils.addDays(startDate, i);
      const weekday = date.toLocaleDateString(undefined, { weekday:'short' });
      const dayNum = date.getDate();
      const $col = $(`
        <div class="plan-col">
          <h4>${weekday} ${dayNum}</h4>
          <div class="meal-row meal-breakfast"><div class="meal-label">Breakfast</div><div class="meal-value">${d.breakfast? d.breakfast.name:''}</div></div>
          <div class="meal-row meal-lunch"><div class="meal-label">Lunch</div><div class="meal-value">${d.lunch? d.lunch.name:''}</div></div>
          <div class="meal-row meal-dinner"><div class="meal-label">Dinner</div><div class="meal-value">${d.dinner? d.dinner.name:''}</div></div>
          ${state.settings.includeDessert ? `<div class="meal-row meal-dessert"><div class="meal-label">Dessert</div><div class="meal-value">${d.dessert? d.dessert.name:''}</div></div>`: ''}
        </div>
      `);
      $grid.append($col);
    }
    $month.append($grid);

    // Week list views
    const totalWeeks = Math.ceil(days.length / 7);
    for (let w = 0; w < totalWeeks; w++){
      const $section = $(`<div class="week-list" data-week="${w+1}"></div>`);
      for (let i=0; i<7; i++){
        const index = w*7 + i;
        const d = days[index];
        if (!d) continue;
        const date = window.AppUtils.addDays(startDate, index);
        const title = date.toLocaleDateString(undefined, { weekday:'long', month:'short', day:'numeric' });
        const $day = $(`
          <div class="week-day">
            <h5>${title}</h5>
            <div class="meal-row meal-breakfast"><div class="meal-label">Breakfast</div><div class="meal-value">${d.breakfast? d.breakfast.name:''}</div></div>
            <div class="meal-row meal-lunch"><div class="meal-label">Lunch</div><div class="meal-value">${d.lunch? d.lunch.name:''}</div></div>
            <div class="meal-row meal-dinner"><div class="meal-label">Dinner</div><div class="meal-value">${d.dinner? d.dinner.name:''}</div></div>
            ${state.settings.includeDessert ? `<div class=\"meal-row meal-dessert\"><div class=\"meal-label\">Dessert</div><div class=\"meal-value\">${d.dessert? d.dessert.name:''}</div></div>`: ''}
          </div>
        `);
        $section.append($day);
      }
      $week.append($section);
    }

    // Set active view
    if (state.ui.activeView === 'month'){
      $('#tab-month').attr('aria-selected','true');
      $('#tab-week').attr('aria-selected','false');
      $('#view-month').removeClass('hidden');
      $('#view-week').addClass('hidden');
    } else {
      $('#tab-month').attr('aria-selected','false');
      $('#tab-week').attr('aria-selected','true');
      $('#view-week').removeClass('hidden');
      $('#view-month').addClass('hidden');
      selectWeek(state.ui.activeWeek);
    }
  }

  function selectWeek(weekIndex){
    state.ui.activeWeek = weekIndex;
    $('#week-picker').val(String(weekIndex));
    $('#view-week [data-week]').each(function(){
      const w = parseInt($(this).attr('data-week'), 10) - 1;
      if (w === weekIndex) $(this).removeClass('hidden'); else $(this).addClass('hidden');
    });
  }

  // Event bindings
  function bindEvents(){
    // Food form
    $('#food-form').on('submit', function(e){
      e.preventDefault();
      const name = String($('#food-name').val() || '').trim();
      if (!name){ $('#food-name')[0].focus(); return; }
      const mealTypes = []; $(this).find('input[name="mealType"]:checked').each(function(){ mealTypes.push($(this).val()); });
      if (!mealTypes.length){ alert('Select at least one meal type'); return; }
      const tags = []; $(this).find('input[name="tag"]:checked').each(function(){ tags.push($(this).val()); });
      addFood({ name, mealTypes, tags });
      this.reset();
    });
    $('#clear-foods').on('click', function(){
      if (!state.foods.length) return;
      if (confirm('Remove all foods from your library?')){
        state.foods = [];
        save();
        renderFoodList();
        showToast('Cleared foods');
      }
    });

    // Suggestions
    $('#suggest-more').on('click', renderSuggestions);
    $('#add-desserts').on('click', function(){
      DEFAULT_DESSERTS.forEach(x => addFood(x));
    });

    // Controls
    $('#start-date').on('change', function(){ state.settings.startDate = this.value; save(); });
    $('#weeks-count').on('change', function(){ state.settings.weeks = parseInt(this.value,10); save(); });
    $('#include-dessert').on('change', function(){ state.settings.includeDessert = this.checked; save(); renderPlanner(); });

    $('#generate-month').on('click', generateMonthPlan);
    $('#regen-week').on('click', function(){ regenerateWeek(state.ui.activeWeek); });
    $('#clear-plan').on('click', function(){ if (confirm('Clear current plan?')){ state.plan = null; save(); renderPlanner(); }});

    // Export and print
    $('#export-week').on('click', function(){ if (!state.plan) return; window.AppExport.downloadCSV(state.plan, 'week', state.ui.activeWeek); });
    $('#export-month').on('click', function(){ if (!state.plan) return; window.AppExport.downloadCSV(state.plan, 'month', 0); });
    $('#print-week').on('click', function(){ if (!state.plan) return; state.ui.activeView = 'week'; renderPlanner(); window.AppPrint.printWeek(state.ui.activeWeek); });
    $('#print-month').on('click', function(){ if (!state.plan) return; state.ui.activeView = 'month'; renderPlanner(); window.AppPrint.printMonth(); });

    // View tabs
    $('#tab-month').on('click', function(){ state.ui.activeView = 'month'; renderPlanner(); });
    $('#tab-week').on('click', function(){ state.ui.activeView = 'week'; renderPlanner(); });
    $('#week-picker').on('change', function(){ selectWeek(parseInt(this.value, 10)); });

    // Header toggle buttons
    $('#nav-month').on('click', function(){ state.ui.activeView = 'month'; renderPlanner(); $(this).attr('aria-selected','true'); $('#nav-week').attr('aria-selected','false'); });
    $('#nav-week').on('click', function(){ state.ui.activeView = 'week'; renderPlanner(); $(this).attr('aria-selected','true'); $('#nav-month').attr('aria-selected','false'); });
  }

  // Public API
  window.App.init = function(){
    load();
    bindEvents();
    // Prefill inputs
    $('#start-date').val(state.settings.startDate);
    $('#weeks-count').val(String(state.settings.weeks));
    $('#include-dessert').prop('checked', state.settings.includeDessert);
    renderFoodList();
    renderSuggestions();
  };

  window.App.render = function(){
    renderPlanner();
    // Default to showing current week in week view
    selectWeek(state.ui.activeWeek);
  };

})(jQuery);
