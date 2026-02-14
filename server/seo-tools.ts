let headTags: any, breadcrumbs: any, wrapPage: any, utmLink: any, BRAND: string, DOMAIN: string;

export function initTools(deps: { headTags: any, breadcrumbs: any, wrapPage: any, utmLink: any, BRAND: string, DOMAIN: string }) {
  headTags = deps.headTags;
  breadcrumbs = deps.breadcrumbs;
  wrapPage = deps.wrapPage;
  utmLink = deps.utmLink;
  BRAND = deps.BRAND;
  DOMAIN = deps.DOMAIN;
}

export function revenuePerChairCalculator(): string {
  const title = `Revenue Per Chair Calculator | Free Tool by ${BRAND}`;
  const description = `Calculate how much revenue each chair or station generates daily, monthly, and annually. Optimize your salon or studio layout for maximum profitability.`;
  const canonical = `${DOMAIN}/tools/revenue-per-chair`;
  const keywords = "revenue per chair calculator, salon revenue calculator, station revenue, chair profitability, salon business calculator";
  const ctaUrl = utmLink("seo", "tool", "revenue-per-chair");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Revenue Per Chair Calculator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Revenue Per Chair<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Find out how much revenue each chair or station in your business generates. Optimize your layout and scheduling for maximum profitability.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="rpc-chairs">Number of Chairs / Stations</label>
          <input type="number" id="rpc-chairs" value="4" min="1" max="50" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="rpc-hours">Hours Open Per Day</label>
          <input type="number" id="rpc-hours" value="10" min="1" max="24" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="rpc-price">Avg Service Price ($)</label>
          <input type="number" id="rpc-price" value="55" min="1" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="rpc-util">Utilization Rate: <span id="rpc-util-val">70</span>%</label>
          <input type="range" id="rpc-util" min="0" max="100" value="70" class="w-full accent-pearl h-2 bg-graphite rounded-lg appearance-none cursor-pointer">
        </div>
      </div>
      <div class="border-t border-white/10 pt-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Daily Revenue / Chair</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="rpc-daily">$0</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Monthly Revenue / Chair</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="rpc-monthly">$0</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Annual Revenue / Chair</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="rpc-annual">$0</p>
          </div>
        </div>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Maximize Every Chair's Potential</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} helps you fill every slot with smart online booking and automated reminders.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var chairs = document.getElementById('rpc-chairs');
      var hours = document.getElementById('rpc-hours');
      var price = document.getElementById('rpc-price');
      var util = document.getElementById('rpc-util');
      var utilVal = document.getElementById('rpc-util-val');
      function calc() {
        var c = parseFloat(chairs.value) || 1;
        var h = parseFloat(hours.value) || 1;
        var p = parseFloat(price.value) || 0;
        var u = parseFloat(util.value) / 100;
        utilVal.textContent = util.value;
        var servicesPerChairPerDay = h * u;
        var daily = servicesPerChairPerDay * p;
        var monthly = daily * 26;
        var annual = daily * 312;
        document.getElementById('rpc-daily').textContent = '$' + Math.round(daily).toLocaleString();
        document.getElementById('rpc-monthly').textContent = '$' + Math.round(monthly).toLocaleString();
        document.getElementById('rpc-annual').textContent = '$' + Math.round(annual).toLocaleString();
      }
      [chairs, hours, price, util].forEach(function(el) { el.addEventListener('input', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function servicePricingCalculator(): string {
  const title = `Service Pricing Calculator | Free Tool by ${BRAND}`;
  const description = `Calculate the ideal price for your services based on supply costs, time, overhead, and desired profit margin.`;
  const canonical = `${DOMAIN}/tools/service-pricing`;
  const keywords = "service pricing calculator, how to price services, salon pricing, service cost calculator, profit margin calculator";
  const ctaUrl = utmLink("seo", "tool", "service-pricing");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Service Pricing Calculator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Service Pricing<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Find the right price for your services by factoring in costs, time, overhead, and your target profit margin.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="sp-supplies">Cost of Supplies ($)</label>
          <input type="number" id="sp-supplies" value="12" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="sp-time">Time Per Service (min)</label>
          <input type="number" id="sp-time" value="45" min="1" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="sp-overhead">Hourly Overhead ($)</label>
          <input type="number" id="sp-overhead" value="25" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="sp-margin">Desired Profit Margin: <span id="sp-margin-val">40</span>%</label>
          <input type="range" id="sp-margin" min="10" max="80" value="40" class="w-full accent-pearl h-2 bg-graphite rounded-lg appearance-none cursor-pointer">
        </div>
      </div>
      <div class="border-t border-white/10 pt-8 text-center">
        <p class="text-silver text-sm uppercase tracking-wider mb-2">Recommended Service Price</p>
        <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="sp-result">$0</p>
        <p class="text-silver text-sm mt-4" id="sp-breakdown"></p>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Price With Confidence</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} lets you showcase your services and prices on a beautiful booking page your clients will love.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var supplies = document.getElementById('sp-supplies');
      var time = document.getElementById('sp-time');
      var overhead = document.getElementById('sp-overhead');
      var margin = document.getElementById('sp-margin');
      var marginVal = document.getElementById('sp-margin-val');
      function calc() {
        var s = parseFloat(supplies.value) || 0;
        var t = parseFloat(time.value) || 1;
        var o = parseFloat(overhead.value) || 0;
        var m = parseFloat(margin.value) / 100;
        marginVal.textContent = margin.value;
        var laborCost = (t / 60) * o;
        var totalCost = s + laborCost;
        var price = totalCost / (1 - m);
        document.getElementById('sp-result').textContent = '$' + price.toFixed(2);
        document.getElementById('sp-breakdown').textContent = 'Supply cost: $' + s.toFixed(2) + ' + Labor: $' + laborCost.toFixed(2) + ' = $' + totalCost.toFixed(2) + ' total cost';
      }
      [supplies, time, overhead, margin].forEach(function(el) { el.addEventListener('input', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function hourlyRateCalculator(): string {
  const title = `Hourly Rate Calculator | Free Tool by ${BRAND}`;
  const description = `Calculate the hourly rate you need to charge to meet your income goals after accounting for expenses and time off.`;
  const canonical = `${DOMAIN}/tools/hourly-rate`;
  const keywords = "hourly rate calculator, freelance rate calculator, how much to charge per hour, service provider rate";
  const ctaUrl = utmLink("seo", "tool", "hourly-rate");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Hourly Rate Calculator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Hourly Rate<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Determine the hourly rate you need to charge to reach your desired annual income after expenses.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="hr-income">Desired Annual Income ($)</label>
          <input type="number" id="hr-income" value="75000" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="hr-weeks">Working Weeks Per Year</label>
          <input type="number" id="hr-weeks" value="48" min="1" max="52" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="hr-hours">Hours Per Week</label>
          <input type="number" id="hr-hours" value="40" min="1" max="80" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="hr-expenses">Business Expenses Per Year ($)</label>
          <input type="number" id="hr-expenses" value="15000" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
      </div>
      <div class="border-t border-white/10 pt-8 text-center">
        <p class="text-silver text-sm uppercase tracking-wider mb-2">Required Hourly Rate</p>
        <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="hr-result">$0</p>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Earn What You Deserve</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} helps you book more clients and fill your schedule so you can hit your income goals.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var income = document.getElementById('hr-income');
      var weeks = document.getElementById('hr-weeks');
      var hours = document.getElementById('hr-hours');
      var expenses = document.getElementById('hr-expenses');
      function calc() {
        var i = parseFloat(income.value) || 0;
        var w = parseFloat(weeks.value) || 1;
        var h = parseFloat(hours.value) || 1;
        var e = parseFloat(expenses.value) || 0;
        var rate = (i + e) / (w * h);
        document.getElementById('hr-result').textContent = '$' + rate.toFixed(2);
      }
      [income, weeks, hours, expenses].forEach(function(el) { el.addEventListener('input', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function tipCalculator(): string {
  const title = `Tip Calculator for Service Professionals | Free Tool by ${BRAND}`;
  const description = `Calculate expected tips per service, daily, monthly, and annually. Plan your income with realistic tip projections.`;
  const canonical = `${DOMAIN}/tools/tip-calculator`;
  const keywords = "tip calculator, service tip calculator, salon tip calculator, daily tips, tip income estimator";
  const ctaUrl = utmLink("seo", "tool", "tip-calculator");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Tip Calculator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Tip Income<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Estimate your tip income based on service price, tip percentage, and daily volume.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="tip-price">Service Price ($)</label>
          <input type="number" id="tip-price" value="65" min="1" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="tip-pct">Tip Percentage: <span id="tip-pct-val">20</span>%</label>
          <input type="range" id="tip-pct" min="10" max="30" value="20" class="w-full accent-pearl h-2 bg-graphite rounded-lg appearance-none cursor-pointer">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="tip-services">Services Per Day</label>
          <input type="number" id="tip-services" value="8" min="1" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
      </div>
      <div class="border-t border-white/10 pt-8">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Per Service</p>
            <p class="font-heading text-4xl sm:text-5xl font-semibold text-pearl" id="tip-per">$0</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Daily Tips</p>
            <p class="font-heading text-4xl sm:text-5xl font-semibold text-pearl" id="tip-daily">$0</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Monthly Tips</p>
            <p class="font-heading text-4xl sm:text-5xl font-semibold text-pearl" id="tip-monthly">$0</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Annual Tips</p>
            <p class="font-heading text-4xl sm:text-5xl font-semibold text-pearl" id="tip-annual">$0</p>
          </div>
        </div>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Book More, Earn More Tips</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} keeps your schedule full so you can maximize your tip income every day.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var price = document.getElementById('tip-price');
      var pct = document.getElementById('tip-pct');
      var pctVal = document.getElementById('tip-pct-val');
      var services = document.getElementById('tip-services');
      function calc() {
        var p = parseFloat(price.value) || 0;
        var t = parseFloat(pct.value) / 100;
        var s = parseFloat(services.value) || 0;
        pctVal.textContent = pct.value;
        var perService = p * t;
        var daily = perService * s;
        var monthly = daily * 26;
        var annual = daily * 312;
        document.getElementById('tip-per').textContent = '$' + perService.toFixed(2);
        document.getElementById('tip-daily').textContent = '$' + Math.round(daily).toLocaleString();
        document.getElementById('tip-monthly').textContent = '$' + Math.round(monthly).toLocaleString();
        document.getElementById('tip-annual').textContent = '$' + Math.round(annual).toLocaleString();
      }
      [price, pct, services].forEach(function(el) { el.addEventListener('input', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function breakEvenCalculator(): string {
  const title = `Break-Even Calculator | Free Tool by ${BRAND}`;
  const description = `Calculate how many bookings you need per month to cover your fixed costs and break even. Essential for service business planning.`;
  const canonical = `${DOMAIN}/tools/break-even`;
  const keywords = "break even calculator, break even point, booking break even, service business break even, fixed costs calculator";
  const ctaUrl = utmLink("seo", "tool", "break-even");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Break-Even Calculator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Break-Even<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Find out exactly how many bookings you need each month to cover your costs and start turning a profit.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="be-fixed">Monthly Fixed Costs ($)</label>
          <input type="number" id="be-fixed" value="5000" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="be-price">Avg Service Price ($)</label>
          <input type="number" id="be-price" value="60" min="1" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="be-variable">Variable Cost Per Service ($)</label>
          <input type="number" id="be-variable" value="15" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
      </div>
      <div class="border-t border-white/10 pt-8 text-center">
        <p class="text-silver text-sm uppercase tracking-wider mb-2">Break-Even Point</p>
        <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="be-result">0</p>
        <p class="text-silver text-lg mt-2">bookings per month</p>
        <p class="text-silver text-sm mt-4" id="be-daily"></p>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Surpass Your Break-Even Faster</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} fills your calendar with 24/7 online booking so you break even sooner and profit more.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var fixed = document.getElementById('be-fixed');
      var price = document.getElementById('be-price');
      var variable = document.getElementById('be-variable');
      function calc() {
        var f = parseFloat(fixed.value) || 0;
        var p = parseFloat(price.value) || 1;
        var v = parseFloat(variable.value) || 0;
        var contribution = p - v;
        var breakEven = contribution > 0 ? Math.ceil(f / contribution) : 0;
        document.getElementById('be-result').textContent = breakEven.toLocaleString();
        var perDay = (breakEven / 26).toFixed(1);
        document.getElementById('be-daily').textContent = 'That is about ' + perDay + ' bookings per working day (26 days/month)';
      }
      [fixed, price, variable].forEach(function(el) { el.addEventListener('input', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function bookingCapacityCalculator(): string {
  const title = `Booking Capacity Calculator | Free Tool by ${BRAND}`;
  const description = `Calculate the maximum number of appointments you can fit in a day, week, and month based on service duration and buffer time.`;
  const canonical = `${DOMAIN}/tools/booking-capacity`;
  const keywords = "booking capacity calculator, appointment capacity, scheduling capacity, max appointments per day, service business capacity";
  const ctaUrl = utmLink("seo", "tool", "booking-capacity");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Booking Capacity Calculator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Booking Capacity<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Determine the maximum number of appointments you can handle daily, weekly, and monthly.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="bc-hours">Working Hours Per Day</label>
          <input type="number" id="bc-hours" value="8" min="1" max="24" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="bc-duration">Avg Service Duration (min)</label>
          <input type="number" id="bc-duration" value="45" min="5" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="bc-buffer">Buffer Between Appointments (min)</label>
          <input type="number" id="bc-buffer" value="10" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="bc-days">Working Days Per Week</label>
          <input type="number" id="bc-days" value="5" min="1" max="7" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
      </div>
      <div class="border-t border-white/10 pt-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Max Daily Appointments</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="bc-daily">0</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Weekly Appointments</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="bc-weekly">0</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Monthly Appointments</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="bc-monthly">0</p>
          </div>
        </div>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Fill Your Capacity Effortlessly</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} makes it easy for clients to book available slots so you maximize your capacity every day.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var hours = document.getElementById('bc-hours');
      var duration = document.getElementById('bc-duration');
      var buffer = document.getElementById('bc-buffer');
      var days = document.getElementById('bc-days');
      function calc() {
        var h = parseFloat(hours.value) || 1;
        var d = parseFloat(duration.value) || 1;
        var b = parseFloat(buffer.value) || 0;
        var w = parseFloat(days.value) || 1;
        var totalMin = h * 60;
        var slotMin = d + b;
        var daily = Math.floor(totalMin / slotMin);
        var weekly = daily * w;
        var monthly = weekly * 4.33;
        document.getElementById('bc-daily').textContent = daily;
        document.getElementById('bc-weekly').textContent = weekly;
        document.getElementById('bc-monthly').textContent = Math.round(monthly);
      }
      [hours, duration, buffer, days].forEach(function(el) { el.addEventListener('input', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function staffSchedulingCalculator(): string {
  const title = `Staff Scheduling Calculator | Free Tool by ${BRAND}`;
  const description = `Calculate how many staff members you need per shift based on expected bookings, service duration, and target utilization.`;
  const canonical = `${DOMAIN}/tools/staff-scheduling`;
  const keywords = "staff scheduling calculator, how many staff needed, shift planning calculator, employee scheduling, staffing calculator";
  const ctaUrl = utmLink("seo", "tool", "staff-scheduling");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Staff Scheduling Calculator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Staff Scheduling<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Determine the optimal number of staff members per shift to handle your expected booking volume.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="ss-bookings">Expected Bookings Per Day</label>
          <input type="number" id="ss-bookings" value="20" min="1" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="ss-duration">Avg Service Duration (min)</label>
          <input type="number" id="ss-duration" value="45" min="5" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="ss-shift">Working Hours Per Shift</label>
          <input type="number" id="ss-shift" value="8" min="1" max="12" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="ss-util">Target Utilization: <span id="ss-util-val">80</span>%</label>
          <input type="range" id="ss-util" min="60" max="100" value="80" class="w-full accent-pearl h-2 bg-graphite rounded-lg appearance-none cursor-pointer">
        </div>
      </div>
      <div class="border-t border-white/10 pt-8 text-center">
        <p class="text-silver text-sm uppercase tracking-wider mb-2">Recommended Staff Per Shift</p>
        <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="ss-result">0</p>
        <p class="text-silver text-sm mt-4" id="ss-detail"></p>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Schedule Staff Smarter</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} gives you booking analytics so you know exactly when to staff up or down.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var bookings = document.getElementById('ss-bookings');
      var duration = document.getElementById('ss-duration');
      var shift = document.getElementById('ss-shift');
      var util = document.getElementById('ss-util');
      var utilVal = document.getElementById('ss-util-val');
      function calc() {
        var b = parseFloat(bookings.value) || 0;
        var d = parseFloat(duration.value) || 1;
        var s = parseFloat(shift.value) || 1;
        var u = parseFloat(util.value) / 100;
        utilVal.textContent = util.value;
        var totalServiceHours = (b * d) / 60;
        var availablePerStaff = s * u;
        var staff = Math.ceil(totalServiceHours / availablePerStaff);
        document.getElementById('ss-result').textContent = staff;
        document.getElementById('ss-detail').textContent = 'Total service hours needed: ' + totalServiceHours.toFixed(1) + 'h | Available per staff: ' + availablePerStaff.toFixed(1) + 'h';
      }
      [bookings, duration, shift, util].forEach(function(el) { el.addEventListener('input', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function timeZoneConverter(): string {
  const title = `Time Zone Converter | Free Tool by ${BRAND}`;
  const description = `Quickly convert appointment times between time zones. Perfect for businesses serving clients across different regions.`;
  const canonical = `${DOMAIN}/tools/timezone-converter`;
  const keywords = "time zone converter, timezone converter, appointment time converter, booking time zone, schedule across time zones";
  const ctaUrl = utmLink("seo", "tool", "timezone-converter");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Time Zone Converter" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Time Zone<br><span class="text-silver">Converter</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Convert appointment times between time zones instantly. Never miss a booking due to time zone confusion.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="tz-time">Select Time</label>
          <input type="time" id="tz-time" value="09:00" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="tz-from">From Time Zone</label>
          <select id="tz-from" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
            <option value="-5">EST (UTC-5)</option>
            <option value="-6">CST (UTC-6)</option>
            <option value="-7">MST (UTC-7)</option>
            <option value="-8" selected>PST (UTC-8)</option>
            <option value="-10">HST (UTC-10)</option>
            <option value="-9">AKST (UTC-9)</option>
            <option value="0">UTC / GMT (UTC+0)</option>
            <option value="1">CET (UTC+1)</option>
            <option value="2">EET (UTC+2)</option>
            <option value="3">MSK (UTC+3)</option>
            <option value="5.5">IST (UTC+5:30)</option>
            <option value="7">ICT (UTC+7)</option>
            <option value="8">CST Asia (UTC+8)</option>
            <option value="9">JST (UTC+9)</option>
            <option value="10">AEST (UTC+10)</option>
            <option value="12">NZST (UTC+12)</option>
          </select>
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="tz-to">To Time Zone</label>
          <select id="tz-to" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
            <option value="-5" selected>EST (UTC-5)</option>
            <option value="-6">CST (UTC-6)</option>
            <option value="-7">MST (UTC-7)</option>
            <option value="-8">PST (UTC-8)</option>
            <option value="-10">HST (UTC-10)</option>
            <option value="-9">AKST (UTC-9)</option>
            <option value="0">UTC / GMT (UTC+0)</option>
            <option value="1">CET (UTC+1)</option>
            <option value="2">EET (UTC+2)</option>
            <option value="3">MSK (UTC+3)</option>
            <option value="5.5">IST (UTC+5:30)</option>
            <option value="7">ICT (UTC+7)</option>
            <option value="8">CST Asia (UTC+8)</option>
            <option value="9">JST (UTC+9)</option>
            <option value="10">AEST (UTC+10)</option>
            <option value="12">NZST (UTC+12)</option>
          </select>
        </div>
      </div>
      <div class="border-t border-white/10 pt-8 text-center">
        <p class="text-silver text-sm uppercase tracking-wider mb-2">Converted Time</p>
        <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="tz-result">--:--</p>
        <p class="text-silver text-sm mt-4" id="tz-detail"></p>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Serve Clients Everywhere</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} automatically handles time zones so your clients always see the right booking times.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var timeEl = document.getElementById('tz-time');
      var fromEl = document.getElementById('tz-from');
      var toEl = document.getElementById('tz-to');
      function calc() {
        var parts = timeEl.value.split(':');
        var hours = parseInt(parts[0]) || 0;
        var minutes = parseInt(parts[1]) || 0;
        var fromOffset = parseFloat(fromEl.value);
        var toOffset = parseFloat(toEl.value);
        var diff = toOffset - fromOffset;
        var totalMin = hours * 60 + minutes + diff * 60;
        var dayShift = '';
        if (totalMin < 0) { totalMin += 1440; dayShift = ' (previous day)'; }
        if (totalMin >= 1440) { totalMin -= 1440; dayShift = ' (next day)'; }
        var h = Math.floor(totalMin / 60);
        var m = Math.round(totalMin % 60);
        var ampm = h >= 12 ? 'PM' : 'AM';
        var h12 = h % 12 || 12;
        var display = h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
        document.getElementById('tz-result').textContent = display;
        document.getElementById('tz-detail').textContent = 'Difference: ' + (diff >= 0 ? '+' : '') + diff + ' hours' + dayShift;
      }
      [timeEl, fromEl, toEl].forEach(function(el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function appointmentBufferCalculator(): string {
  const title = `Appointment Buffer Calculator | Free Tool by ${BRAND}`;
  const description = `Calculate the ideal buffer time between appointments based on service duration, prep time, and schedule preferences.`;
  const canonical = `${DOMAIN}/tools/appointment-buffer`;
  const keywords = "appointment buffer calculator, buffer time between appointments, scheduling buffer, prep time calculator, appointment spacing";
  const ctaUrl = utmLink("seo", "tool", "appointment-buffer");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Appointment Buffer Calculator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Appointment Buffer<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Find the right amount of buffer time between appointments to keep your day running smoothly without wasting time.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="ab-duration">Avg Service Duration (min)</label>
          <input type="number" id="ab-duration" value="45" min="5" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="ab-cleanup">Cleanup / Prep Time (min)</label>
          <input type="number" id="ab-cleanup" value="10" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="ab-travel">Travel Time Between Locations (min)</label>
          <input type="number" id="ab-travel" value="0" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="ab-padding">Schedule Padding: <span id="ab-padding-val">Moderate</span></label>
          <input type="range" id="ab-padding" min="1" max="3" value="2" step="1" class="w-full accent-pearl h-2 bg-graphite rounded-lg appearance-none cursor-pointer">
          <div class="flex justify-between text-silver text-xs mt-1"><span>Tight</span><span>Moderate</span><span>Comfortable</span></div>
        </div>
      </div>
      <div class="border-t border-white/10 pt-8 text-center">
        <p class="text-silver text-sm uppercase tracking-wider mb-2">Recommended Buffer Time</p>
        <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="ab-result">0</p>
        <p class="text-silver text-lg mt-2">minutes between appointments</p>
        <p class="text-silver text-sm mt-4" id="ab-detail"></p>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Automate Your Buffer Times</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} automatically adds buffer time between bookings so your schedule always runs on time.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var duration = document.getElementById('ab-duration');
      var cleanup = document.getElementById('ab-cleanup');
      var travel = document.getElementById('ab-travel');
      var padding = document.getElementById('ab-padding');
      var paddingVal = document.getElementById('ab-padding-val');
      function calc() {
        var c = parseFloat(cleanup.value) || 0;
        var t = parseFloat(travel.value) || 0;
        var p = parseInt(padding.value);
        var labels = {1: 'Tight', 2: 'Moderate', 3: 'Comfortable'};
        var multipliers = {1: 1.0, 2: 1.3, 3: 1.6};
        paddingVal.textContent = labels[p];
        var base = c + t;
        var buffer = Math.ceil(base * multipliers[p]);
        if (buffer < 5 && p >= 2) buffer = 5;
        document.getElementById('ab-result').textContent = buffer;
        var totalBlock = parseFloat(duration.value) + buffer;
        document.getElementById('ab-detail').textContent = 'Total time block per appointment: ' + totalBlock + ' minutes';
      }
      [duration, cleanup, travel, padding].forEach(function(el) { el.addEventListener('input', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function clientLifetimeValueCalculator(): string {
  const title = `Client Lifetime Value Calculator | Free Tool by ${BRAND}`;
  const description = `Calculate the total lifetime value of each client including referrals. Understand how much each client is really worth to your business.`;
  const canonical = `${DOMAIN}/tools/client-lifetime-value`;
  const keywords = "client lifetime value calculator, CLV calculator, customer lifetime value, client value, LTV calculator";
  const ctaUrl = utmLink("seo", "tool", "client-lifetime-value");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Client Lifetime Value Calculator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Client Lifetime Value<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Discover the true value of each client over their entire relationship with your business, including referral value.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="clv-spend">Avg Spend Per Visit ($)</label>
          <input type="number" id="clv-spend" value="75" min="1" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="clv-visits">Visits Per Year</label>
          <input type="number" id="clv-visits" value="8" min="1" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="clv-retention">Avg Client Retention: <span id="clv-retention-val">5</span> years</label>
          <input type="range" id="clv-retention" min="1" max="10" value="5" class="w-full accent-pearl h-2 bg-graphite rounded-lg appearance-none cursor-pointer">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="clv-referral">Referral Value Per Client / Year ($)</label>
          <input type="number" id="clv-referral" value="50" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
      </div>
      <div class="border-t border-white/10 pt-8 text-center">
        <p class="text-silver text-sm uppercase tracking-wider mb-2">Client Lifetime Value</p>
        <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="clv-result">$0</p>
        <p class="text-silver text-sm mt-4" id="clv-detail"></p>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Retain More High-Value Clients</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} helps you keep clients coming back with automated rebooking reminders and seamless scheduling.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var spend = document.getElementById('clv-spend');
      var visits = document.getElementById('clv-visits');
      var retention = document.getElementById('clv-retention');
      var retentionVal = document.getElementById('clv-retention-val');
      var referral = document.getElementById('clv-referral');
      function calc() {
        var s = parseFloat(spend.value) || 0;
        var v = parseFloat(visits.value) || 0;
        var r = parseFloat(retention.value) || 1;
        var ref = parseFloat(referral.value) || 0;
        retentionVal.textContent = retention.value;
        var annualSpend = s * v;
        var totalSpend = annualSpend * r;
        var totalReferral = ref * r;
        var clv = totalSpend + totalReferral;
        document.getElementById('clv-result').textContent = '$' + Math.round(clv).toLocaleString();
        document.getElementById('clv-detail').textContent = 'Direct spending: $' + Math.round(totalSpend).toLocaleString() + ' + Referral value: $' + Math.round(totalReferral).toLocaleString();
      }
      [spend, visits, retention, referral].forEach(function(el) { el.addEventListener('input', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function clientRetentionRateCalculator(): string {
  const title = `Client Retention Rate Calculator | Free Tool by ${BRAND}`;
  const description = `Calculate your client retention rate to understand how well you keep customers coming back. A key metric for service businesses.`;
  const canonical = `${DOMAIN}/tools/client-retention-rate`;
  const keywords = "client retention rate calculator, customer retention rate, retention rate formula, client retention metric";
  const ctaUrl = utmLink("seo", "tool", "client-retention-rate");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Client Retention Rate Calculator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Client Retention Rate<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Measure how well your business retains clients over any time period. Retention is the foundation of sustainable growth.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="crr-start">Clients at Start of Period</label>
          <input type="number" id="crr-start" value="200" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="crr-new">New Clients During Period</label>
          <input type="number" id="crr-new" value="40" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="crr-end">Clients at End of Period</label>
          <input type="number" id="crr-end" value="210" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
      </div>
      <div class="border-t border-white/10 pt-8 text-center">
        <p class="text-silver text-sm uppercase tracking-wider mb-2">Client Retention Rate</p>
        <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="crr-result">0%</p>
        <p class="text-silver text-sm mt-4" id="crr-detail"></p>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Boost Your Retention Rate</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} sends automated rebooking reminders so clients never forget to come back.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var start = document.getElementById('crr-start');
      var newC = document.getElementById('crr-new');
      var end = document.getElementById('crr-end');
      function calc() {
        var s = parseFloat(start.value) || 0;
        var n = parseFloat(newC.value) || 0;
        var e = parseFloat(end.value) || 0;
        var rate = s > 0 ? ((e - n) / s) * 100 : 0;
        rate = Math.max(0, Math.min(100, rate));
        document.getElementById('crr-result').textContent = rate.toFixed(1) + '%';
        var lost = s + n - e;
        document.getElementById('crr-detail').textContent = 'Retained: ' + (e - n) + ' of ' + s + ' original clients | Lost: ' + Math.max(0, lost) + ' clients';
      }
      [start, newC, end].forEach(function(el) { el.addEventListener('input', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function rebookingRateCalculator(): string {
  const title = `Rebooking Rate Calculator | Free Tool by ${BRAND}`;
  const description = `Track your 30, 60, and 90 day rebooking rates. See how quickly clients return and identify opportunities to increase rebookings.`;
  const canonical = `${DOMAIN}/tools/rebooking-rate`;
  const keywords = "rebooking rate calculator, client rebooking rate, return rate calculator, repeat booking rate";
  const ctaUrl = utmLink("seo", "tool", "rebooking-rate");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Rebooking Rate Calculator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Rebooking Rate<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Measure your 30, 60, and 90 day rebooking rates to understand client return behavior.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="rb-total">Total Clients Served</label>
          <input type="number" id="rb-total" value="100" min="1" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="rb-30">Rebooked Within 30 Days</label>
          <input type="number" id="rb-30" value="45" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="rb-60">Rebooked Within 60 Days</label>
          <input type="number" id="rb-60" value="65" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="rb-90">Rebooked Within 90 Days</label>
          <input type="number" id="rb-90" value="78" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
      </div>
      <div class="border-t border-white/10 pt-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">30-Day Rate</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="rb-rate30">0%</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">60-Day Rate</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="rb-rate60">0%</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">90-Day Rate</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="rb-rate90">0%</p>
          </div>
        </div>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Increase Rebooking Rates</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} lets clients rebook at checkout and sends smart reminders to bring them back sooner.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var total = document.getElementById('rb-total');
      var r30 = document.getElementById('rb-30');
      var r60 = document.getElementById('rb-60');
      var r90 = document.getElementById('rb-90');
      function calc() {
        var t = parseFloat(total.value) || 1;
        var v30 = parseFloat(r30.value) || 0;
        var v60 = parseFloat(r60.value) || 0;
        var v90 = parseFloat(r90.value) || 0;
        document.getElementById('rb-rate30').textContent = ((v30 / t) * 100).toFixed(1) + '%';
        document.getElementById('rb-rate60').textContent = ((v60 / t) * 100).toFixed(1) + '%';
        document.getElementById('rb-rate90').textContent = ((v90 / t) * 100).toFixed(1) + '%';
      }
      [total, r30, r60, r90].forEach(function(el) { el.addEventListener('input', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function marketingRoiCalculator(): string {
  const title = `Marketing ROI Calculator | Free Tool by ${BRAND}`;
  const description = `Calculate the return on investment for your marketing spend. See your cost per acquisition, ROI percentage, and lifetime value per marketing dollar.`;
  const canonical = `${DOMAIN}/tools/marketing-roi`;
  const keywords = "marketing ROI calculator, return on investment calculator, cost per acquisition, marketing spend ROI, client acquisition cost";
  const ctaUrl = utmLink("seo", "tool", "marketing-roi");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Marketing ROI Calculator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Marketing ROI<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Measure the effectiveness of your marketing spend. See exactly what each dollar invested brings back in revenue.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="mroi-spend">Monthly Marketing Spend ($)</label>
          <input type="number" id="mroi-spend" value="500" min="1" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="mroi-clients">New Clients From Marketing</label>
          <input type="number" id="mroi-clients" value="10" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="mroi-revenue">Avg Revenue Per New Client ($)</label>
          <input type="number" id="mroi-revenue" value="75" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="mroi-lifetime">Avg Client Lifetime (months)</label>
          <input type="number" id="mroi-lifetime" value="24" min="1" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
      </div>
      <div class="border-t border-white/10 pt-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">ROI Percentage</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="mroi-roi">0%</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Cost Per Acquisition</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="mroi-cpa">$0</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">LTV Per Marketing $</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="mroi-ltv">$0</p>
          </div>
        </div>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Turn Marketing Into Bookings</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} tracks where your bookings come from so you know which marketing channels work best.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var spend = document.getElementById('mroi-spend');
      var clients = document.getElementById('mroi-clients');
      var revenue = document.getElementById('mroi-revenue');
      var lifetime = document.getElementById('mroi-lifetime');
      function calc() {
        var s = parseFloat(spend.value) || 1;
        var c = parseFloat(clients.value) || 0;
        var r = parseFloat(revenue.value) || 0;
        var l = parseFloat(lifetime.value) || 1;
        var monthlyRevenue = c * r;
        var totalLTV = monthlyRevenue * l;
        var roi = ((monthlyRevenue - s) / s) * 100;
        var cpa = c > 0 ? s / c : 0;
        var ltvPerDollar = totalLTV / s;
        document.getElementById('mroi-roi').textContent = roi.toFixed(1) + '%';
        document.getElementById('mroi-cpa').textContent = '$' + cpa.toFixed(2);
        document.getElementById('mroi-ltv').textContent = '$' + ltvPerDollar.toFixed(2);
      }
      [spend, clients, revenue, lifetime].forEach(function(el) { el.addEventListener('input', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function emailOpenRateBenchmark(): string {
  const title = `Email Open Rate Benchmark | Free Tool by ${BRAND}`;
  const description = `Compare your email open and click rates against industry averages. See if your email marketing is above or below benchmark.`;
  const canonical = `${DOMAIN}/tools/email-open-rate`;
  const keywords = "email open rate benchmark, email click rate, industry email averages, email marketing benchmark, salon email rate";
  const ctaUrl = utmLink("seo", "tool", "email-open-rate");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Email Open Rate Benchmark" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Email Open Rate<br><span class="text-silver">Benchmark</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">See how your email marketing performance compares to industry averages for your type of business.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="eor-open">Your Open Rate (%)</label>
          <input type="number" id="eor-open" value="22" min="0" max="100" step="0.1" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="eor-click">Your Click Rate (%)</label>
          <input type="number" id="eor-click" value="3.2" min="0" max="100" step="0.1" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="eor-industry">Your Industry</label>
          <select id="eor-industry" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
            <option value="salon">Salon / Beauty</option>
            <option value="fitness">Fitness / Gym</option>
            <option value="medical">Medical / Health</option>
            <option value="consulting">Consulting</option>
            <option value="general">General Services</option>
          </select>
        </div>
      </div>
      <div class="border-t border-white/10 pt-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="text-center">
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Open Rate Comparison</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold" id="eor-open-rating" style="color: #f5f5f7;">--</p>
            <p class="text-silver text-sm mt-2" id="eor-open-detail"></p>
          </div>
          <div class="text-center">
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Click Rate Comparison</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold" id="eor-click-rating" style="color: #f5f5f7;">--</p>
            <p class="text-silver text-sm mt-2" id="eor-click-detail"></p>
          </div>
        </div>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Send Emails That Get Opened</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} sends beautifully designed booking reminders with industry-leading open rates.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var openEl = document.getElementById('eor-open');
      var clickEl = document.getElementById('eor-click');
      var industryEl = document.getElementById('eor-industry');
      var benchmarks = {
        salon: { open: 25, click: 3.5 },
        fitness: { open: 22, click: 2.8 },
        medical: { open: 28, click: 3.8 },
        consulting: { open: 20, click: 2.5 },
        general: { open: 21, click: 2.6 }
      };
      function rate(yours, avg) {
        var diff = yours - avg;
        if (diff > 3) return 'Above Avg';
        if (diff < -3) return 'Below Avg';
        return 'At Average';
      }
      function calc() {
        var o = parseFloat(openEl.value) || 0;
        var c = parseFloat(clickEl.value) || 0;
        var ind = industryEl.value;
        var b = benchmarks[ind] || benchmarks.general;
        var openRating = rate(o, b.open);
        var clickRating = rate(c, b.click);
        document.getElementById('eor-open-rating').textContent = openRating;
        document.getElementById('eor-open-detail').textContent = 'Your: ' + o + '% | Industry avg: ' + b.open + '%';
        document.getElementById('eor-click-rating').textContent = clickRating;
        document.getElementById('eor-click-detail').textContent = 'Your: ' + c + '% | Industry avg: ' + b.click + '%';
      }
      [openEl, clickEl, industryEl].forEach(function(el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function cancellationCostCalculator(): string {
  const title = `Cancellation Cost Calculator | Free Tool by ${BRAND}`;
  const description = `Calculate how much revenue you lose to cancellations weekly, monthly, and annually, accounting for rebooking recovery.`;
  const canonical = `${DOMAIN}/tools/cancellation-cost`;
  const keywords = "cancellation cost calculator, revenue lost to cancellations, appointment cancellation cost, rebooking rate calculator";
  const ctaUrl = utmLink("seo", "tool", "cancellation-cost");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Cancellation Cost Calculator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Cancellation Cost<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">See exactly how much revenue you lose to cancellations, and how rebooking success affects your bottom line.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="cc-cancel">Cancellations Per Week</label>
          <input type="number" id="cc-cancel" value="5" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="cc-price">Avg Service Price ($)</label>
          <input type="number" id="cc-price" value="65" min="1" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="cc-notice">Avg Notice Time (hours)</label>
          <input type="number" id="cc-notice" value="4" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="cc-rebook">Rebooking Success Rate: <span id="cc-rebook-val">30</span>%</label>
          <input type="range" id="cc-rebook" min="0" max="100" value="30" class="w-full accent-pearl h-2 bg-graphite rounded-lg appearance-none cursor-pointer">
        </div>
      </div>
      <div class="border-t border-white/10 pt-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Weekly Revenue Lost</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="cc-weekly">$0</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Monthly Revenue Lost</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="cc-monthly">$0</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Annual Revenue Lost</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="cc-annual">$0</p>
          </div>
        </div>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Reduce Cancellations Instantly</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} sends automated reminders and lets you collect deposits to slash cancellation rates.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var cancel = document.getElementById('cc-cancel');
      var price = document.getElementById('cc-price');
      var notice = document.getElementById('cc-notice');
      var rebook = document.getElementById('cc-rebook');
      var rebookVal = document.getElementById('cc-rebook-val');
      function calc() {
        var c = parseFloat(cancel.value) || 0;
        var p = parseFloat(price.value) || 0;
        var r = parseFloat(rebook.value) / 100;
        rebookVal.textContent = rebook.value;
        var grossLoss = c * p;
        var netLoss = grossLoss * (1 - r);
        var weekly = netLoss;
        var monthly = weekly * 4.33;
        var annual = weekly * 52;
        document.getElementById('cc-weekly').textContent = '$' + Math.round(weekly).toLocaleString();
        document.getElementById('cc-monthly').textContent = '$' + Math.round(monthly).toLocaleString();
        document.getElementById('cc-annual').textContent = '$' + Math.round(annual).toLocaleString();
      }
      [cancel, price, notice, rebook].forEach(function(el) { el.addEventListener('input', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function depositAmountCalculator(): string {
  const title = `Deposit Amount Calculator | Free Tool by ${BRAND}`;
  const description = `Calculate the ideal deposit amount to reduce no-shows and protect your revenue. See projected savings from implementing deposits.`;
  const canonical = `${DOMAIN}/tools/deposit-calculator`;
  const keywords = "deposit amount calculator, booking deposit calculator, no-show deposit, appointment deposit, reduce no-shows with deposits";
  const ctaUrl = utmLink("seo", "tool", "deposit-calculator");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Deposit Amount Calculator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Deposit Amount<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Find the optimal deposit amount to reduce no-shows while keeping your booking process client-friendly.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="dep-price">Avg Service Price ($)</label>
          <input type="number" id="dep-price" value="80" min="1" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="dep-noshow">Current No-Show Rate: <span id="dep-noshow-val">15</span>%</label>
          <input type="range" id="dep-noshow" min="1" max="50" value="15" class="w-full accent-pearl h-2 bg-graphite rounded-lg appearance-none cursor-pointer">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="dep-reduce">Desired No-Show Reduction: <span id="dep-reduce-val">50</span>%</label>
          <input type="range" id="dep-reduce" min="10" max="80" value="50" class="w-full accent-pearl h-2 bg-graphite rounded-lg appearance-none cursor-pointer">
        </div>
      </div>
      <div class="border-t border-white/10 pt-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Recommended Deposit</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="dep-amount">$0</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Expected New No-Show Rate</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="dep-newrate">0%</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Projected Annual Savings</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="dep-savings">$0</p>
          </div>
        </div>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Collect Deposits Seamlessly</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} makes it easy to collect deposits at booking time, dramatically reducing no-shows.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var price = document.getElementById('dep-price');
      var noshow = document.getElementById('dep-noshow');
      var noshowVal = document.getElementById('dep-noshow-val');
      var reduce = document.getElementById('dep-reduce');
      var reduceVal = document.getElementById('dep-reduce-val');
      function calc() {
        var p = parseFloat(price.value) || 0;
        var ns = parseFloat(noshow.value) / 100;
        var rd = parseFloat(reduce.value) / 100;
        noshowVal.textContent = noshow.value;
        reduceVal.textContent = reduce.value;
        var deposit = Math.round(p * 0.25 * (1 + rd));
        deposit = Math.min(deposit, Math.round(p * 0.5));
        var newRate = ns * (1 - rd);
        var bookingsPerMonth = 100;
        var oldLoss = bookingsPerMonth * ns * p;
        var newLoss = bookingsPerMonth * newRate * p;
        var monthlySavings = oldLoss - newLoss;
        var annualSavings = monthlySavings * 12;
        document.getElementById('dep-amount').textContent = '$' + deposit;
        document.getElementById('dep-newrate').textContent = (newRate * 100).toFixed(1) + '%';
        document.getElementById('dep-savings').textContent = '$' + Math.round(annualSavings).toLocaleString();
      }
      [price, noshow, reduce].forEach(function(el) { el.addEventListener('input', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function utilizationRateCalculator(): string {
  const title = `Utilization Rate Calculator | Free Tool by ${BRAND}`;
  const description = `Calculate your booking utilization rate and see how much revenue you could gain by reaching the 85% industry benchmark.`;
  const canonical = `${DOMAIN}/tools/utilization-rate`;
  const keywords = "utilization rate calculator, booking utilization, scheduling efficiency, capacity utilization, service business utilization";
  const ctaUrl = utmLink("seo", "tool", "utilization-rate");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Utilization Rate Calculator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Utilization Rate<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Measure your scheduling efficiency and discover the revenue opportunity from filling more of your available time.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="ur-available">Available Hours Per Day</label>
          <input type="number" id="ur-available" value="8" min="1" max="24" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="ur-booked">Booked Hours Per Day</label>
          <input type="number" id="ur-booked" value="5.5" min="0" max="24" step="0.5" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="ur-days">Working Days Per Week</label>
          <input type="number" id="ur-days" value="5" min="1" max="7" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
      </div>
      <div class="border-t border-white/10 pt-8 text-center">
        <p class="text-silver text-sm uppercase tracking-wider mb-2">Your Utilization Rate</p>
        <p class="font-heading text-5xl sm:text-6xl font-semibold" id="ur-rate" style="color: #f5f5f7;">0%</p>
        <p class="text-silver text-sm mt-4" id="ur-detail"></p>
        <p class="text-silver text-sm mt-2" id="ur-opportunity"></p>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Hit 85%+ Utilization</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} fills your empty slots with 24/7 online booking and smart waitlist management.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var available = document.getElementById('ur-available');
      var booked = document.getElementById('ur-booked');
      var days = document.getElementById('ur-days');
      function calc() {
        var a = parseFloat(available.value) || 1;
        var b = parseFloat(booked.value) || 0;
        var d = parseFloat(days.value) || 1;
        var rate = (b / a) * 100;
        var benchmark = 85;
        var el = document.getElementById('ur-rate');
        el.textContent = rate.toFixed(1) + '%';
        if (rate >= benchmark) {
          el.style.color = '#4ade80';
        } else if (rate >= 60) {
          el.style.color = '#facc15';
        } else {
          el.style.color = '#f87171';
        }
        var gap = Math.max(0, (benchmark / 100 * a) - b);
        var weeklyGap = gap * d;
        document.getElementById('ur-detail').textContent = 'Industry benchmark: ' + benchmark + '% | You are ' + (rate >= benchmark ? 'above' : Math.abs(benchmark - rate).toFixed(1) + '% below') + ' benchmark';
        document.getElementById('ur-opportunity').textContent = gap > 0 ? 'Opportunity: ' + gap.toFixed(1) + ' more bookable hours/day (' + weeklyGap.toFixed(1) + ' hours/week)' : 'Great job! You are at or above the industry benchmark.';
      }
      [available, booked, days].forEach(function(el) { el.addEventListener('input', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function revenuePerHourCalculator(): string {
  const title = `Revenue Per Hour Calculator | Free Tool by ${BRAND}`;
  const description = `Compare the revenue per hour across your services. Identify your most and least profitable offerings to optimize your menu.`;
  const canonical = `${DOMAIN}/tools/revenue-per-hour`;
  const keywords = "revenue per hour calculator, service profitability, most profitable services, revenue per service hour, service menu optimization";
  const ctaUrl = utmLink("seo", "tool", "revenue-per-hour");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Revenue Per Hour Calculator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Revenue Per Hour<br><span class="text-silver">Calculator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Compare revenue per hour across your services to find your most and least profitable offerings.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="space-y-4 mb-8">
        <div class="grid grid-cols-12 gap-3 text-silver text-sm font-medium">
          <div class="col-span-4">Service Name</div>
          <div class="col-span-3">Duration (min)</div>
          <div class="col-span-3">Price ($)</div>
          <div class="col-span-2">$/Hour</div>
        </div>
        <div id="rph-rows">
          <div class="grid grid-cols-12 gap-3 items-center rph-row">
            <div class="col-span-4"><input type="text" value="Haircut" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors rph-name"></div>
            <div class="col-span-3"><input type="number" value="30" min="5" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors rph-dur"></div>
            <div class="col-span-3"><input type="number" value="45" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors rph-price"></div>
            <div class="col-span-2 font-heading text-2xl font-semibold text-pearl rph-result">$0</div>
          </div>
          <div class="grid grid-cols-12 gap-3 items-center rph-row">
            <div class="col-span-4"><input type="text" value="Color" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors rph-name"></div>
            <div class="col-span-3"><input type="number" value="90" min="5" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors rph-dur"></div>
            <div class="col-span-3"><input type="number" value="120" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors rph-price"></div>
            <div class="col-span-2 font-heading text-2xl font-semibold text-pearl rph-result">$0</div>
          </div>
          <div class="grid grid-cols-12 gap-3 items-center rph-row">
            <div class="col-span-4"><input type="text" value="Blowout" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors rph-name"></div>
            <div class="col-span-3"><input type="number" value="20" min="5" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors rph-dur"></div>
            <div class="col-span-3"><input type="number" value="35" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors rph-price"></div>
            <div class="col-span-2 font-heading text-2xl font-semibold text-pearl rph-result">$0</div>
          </div>
          <div class="grid grid-cols-12 gap-3 items-center rph-row">
            <div class="col-span-4"><input type="text" value="" placeholder="Service 4" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors rph-name"></div>
            <div class="col-span-3"><input type="number" value="" placeholder="min" min="5" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors rph-dur"></div>
            <div class="col-span-3"><input type="number" value="" placeholder="$" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors rph-price"></div>
            <div class="col-span-2 font-heading text-2xl font-semibold text-pearl rph-result">--</div>
          </div>
          <div class="grid grid-cols-12 gap-3 items-center rph-row">
            <div class="col-span-4"><input type="text" value="" placeholder="Service 5" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors rph-name"></div>
            <div class="col-span-3"><input type="number" value="" placeholder="min" min="5" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors rph-dur"></div>
            <div class="col-span-3"><input type="number" value="" placeholder="$" min="0" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors rph-price"></div>
            <div class="col-span-2 font-heading text-2xl font-semibold text-pearl rph-result">--</div>
          </div>
        </div>
      </div>
      <div class="border-t border-white/10 pt-8 text-center">
        <p class="text-silver text-sm" id="rph-summary"></p>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Promote Your Best Services</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} lets you highlight your most profitable services on your booking page to drive revenue.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      function calc() {
        var rows = document.querySelectorAll('.rph-row');
        var results = [];
        rows.forEach(function(row) {
          var name = row.querySelector('.rph-name').value;
          var dur = parseFloat(row.querySelector('.rph-dur').value);
          var price = parseFloat(row.querySelector('.rph-price').value);
          var resultEl = row.querySelector('.rph-result');
          if (name && dur > 0 && price > 0) {
            var rph = (price / dur) * 60;
            resultEl.textContent = '$' + rph.toFixed(0);
            results.push({ name: name, rph: rph, el: resultEl });
          } else {
            resultEl.textContent = '--';
          }
        });
        rows.forEach(function(row) {
          row.querySelector('.rph-result').style.color = '#f5f5f7';
        });
        if (results.length >= 2) {
          var sorted = results.slice().sort(function(a,b) { return b.rph - a.rph; });
          sorted[0].el.style.color = '#4ade80';
          sorted[sorted.length - 1].el.style.color = '#f87171';
          document.getElementById('rph-summary').textContent = 'Most profitable: ' + sorted[0].name + ' ($' + sorted[0].rph.toFixed(0) + '/hr) | Least profitable: ' + sorted[sorted.length-1].name + ' ($' + sorted[sorted.length-1].rph.toFixed(0) + '/hr)';
        } else {
          document.getElementById('rph-summary').textContent = 'Add at least 2 services to compare profitability.';
        }
      }
      document.getElementById('rph-rows').addEventListener('input', calc);
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function businessHoursOptimizer(): string {
  const title = `Business Hours Optimizer | Free Tool by ${BRAND}`;
  const description = `Analyze your current business hours and see if extending or adjusting them could increase your revenue based on peak vs off-peak bookings.`;
  const canonical = `${DOMAIN}/tools/business-hours-optimizer`;
  const keywords = "business hours optimizer, optimal business hours, peak hours analysis, revenue by hours, scheduling hours optimizer";
  const ctaUrl = utmLink("seo", "tool", "business-hours-optimizer");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Business Hours Optimizer" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Business Hours<br><span class="text-silver">Optimizer</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Analyze whether your current business hours are maximizing revenue, or if extending hours could bring in more bookings.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="bho-open">Current Open Time</label>
          <input type="time" id="bho-open" value="09:00" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="bho-close">Current Close Time</label>
          <input type="time" id="bho-close" value="18:00" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="bho-peakstart">Peak Hours Start</label>
          <input type="time" id="bho-peakstart" value="11:00" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="bho-peakend">Peak Hours End</label>
          <input type="time" id="bho-peakend" value="15:00" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="bho-peakbook">Avg Bookings During Peak (per hour)</label>
          <input type="number" id="bho-peakbook" value="4" min="0" step="0.5" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="bho-offbook">Avg Bookings Off-Peak (per hour)</label>
          <input type="number" id="bho-offbook" value="1.5" min="0" step="0.5" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
        </div>
      </div>
      <div class="border-t border-white/10 pt-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-center mb-6">
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Current Daily Bookings</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="bho-current">0</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Extended Hours (8am-8pm)</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="bho-extended">0</p>
          </div>
        </div>
        <p class="text-center text-silver text-sm" id="bho-recommendation"></p>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Optimize Your Schedule</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} accepts bookings 24/7 online, even outside your business hours, so clients can book when it suits them.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var openEl = document.getElementById('bho-open');
      var closeEl = document.getElementById('bho-close');
      var peakStart = document.getElementById('bho-peakstart');
      var peakEnd = document.getElementById('bho-peakend');
      var peakBook = document.getElementById('bho-peakbook');
      var offBook = document.getElementById('bho-offbook');
      function toHours(t) { var p = t.split(':'); return parseInt(p[0]) + parseInt(p[1])/60; }
      function calc() {
        var o = toHours(openEl.value);
        var c = toHours(closeEl.value);
        var ps = toHours(peakStart.value);
        var pe = toHours(peakEnd.value);
        var pb = parseFloat(peakBook.value) || 0;
        var ob = parseFloat(offBook.value) || 0;
        var totalHours = c - o;
        var peakHours = Math.max(0, Math.min(pe, c) - Math.max(ps, o));
        var offPeakHours = totalHours - peakHours;
        var currentBookings = (peakHours * pb) + (offPeakHours * ob);
        var extO = 8, extC = 20;
        var extTotal = extC - extO;
        var extPeakHours = Math.max(0, Math.min(pe, extC) - Math.max(ps, extO));
        var extOffPeak = extTotal - extPeakHours;
        var extBookings = (extPeakHours * pb) + (extOffPeak * ob);
        document.getElementById('bho-current').textContent = currentBookings.toFixed(1);
        document.getElementById('bho-extended').textContent = extBookings.toFixed(1);
        var diff = extBookings - currentBookings;
        if (diff > 1) {
          document.getElementById('bho-recommendation').textContent = 'Extending to 8am-8pm could add ~' + diff.toFixed(1) + ' more bookings per day. Consider expanding your hours!';
        } else {
          document.getElementById('bho-recommendation').textContent = 'Your current hours appear well-optimized. Focus on increasing bookings during off-peak periods.';
        }
      }
      [openEl, closeEl, peakStart, peakEnd, peakBook, offBook].forEach(function(el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function serviceDurationEstimator(): string {
  const title = `Service Duration Estimator | Free Tool by ${BRAND}`;
  const description = `Get recommended service durations based on service type, experience level, and complexity. Optimize your scheduling blocks.`;
  const canonical = `${DOMAIN}/tools/service-duration`;
  const keywords = "service duration estimator, appointment duration, how long should a service take, scheduling block time, service time calculator";
  const ctaUrl = utmLink("seo", "tool", "service-duration");
  const head = headTags(title, description, canonical, keywords);
  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "Service Duration Estimator" },
    ])}
    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Service Duration<br><span class="text-silver">Estimator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">Get smart duration recommendations based on service type, your experience level, and complexity to optimize your scheduling.</p>
    </section>
    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="sde-type">Service Type</label>
          <select id="sde-type" class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
            <option value="haircut">Haircut</option>
            <option value="color">Color Treatment</option>
            <option value="massage">Massage</option>
            <option value="facial">Facial</option>
            <option value="consultation">Consultation</option>
            <option value="dental">Dental Cleaning</option>
            <option value="manicure">Manicure</option>
            <option value="pedicure">Pedicure</option>
            <option value="waxing">Waxing</option>
            <option value="tattoo">Tattoo Session</option>
          </select>
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="sde-exp">Experience Level: <span id="sde-exp-val">Intermediate</span></label>
          <input type="range" id="sde-exp" min="1" max="3" value="2" step="1" class="w-full accent-pearl h-2 bg-graphite rounded-lg appearance-none cursor-pointer">
          <div class="flex justify-between text-silver text-xs mt-1"><span>Beginner</span><span>Intermediate</span><span>Expert</span></div>
        </div>
        <div>
          <label class="block text-pearl font-medium mb-2 text-sm" for="sde-complex">Complexity: <span id="sde-complex-val">Moderate</span></label>
          <input type="range" id="sde-complex" min="1" max="3" value="2" step="1" class="w-full accent-pearl h-2 bg-graphite rounded-lg appearance-none cursor-pointer">
          <div class="flex justify-between text-silver text-xs mt-1"><span>Simple</span><span>Moderate</span><span>Complex</span></div>
        </div>
      </div>
      <div class="border-t border-white/10 pt-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Recommended Duration</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="sde-duration">0</p>
            <p class="text-silver text-sm mt-1">minutes</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Buffer Time</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="sde-buffer">0</p>
            <p class="text-silver text-sm mt-1">minutes</p>
          </div>
          <div>
            <p class="text-silver text-sm uppercase tracking-wider mb-2">Total Block Time</p>
            <p class="font-heading text-5xl sm:text-6xl font-semibold text-pearl" id="sde-total">0</p>
            <p class="text-silver text-sm mt-1">minutes</p>
          </div>
        </div>
      </div>
    </section>
    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Perfect Scheduling Every Time</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} lets you set custom durations and buffers for each service so your calendar runs like clockwork.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>
  <script>
    (function() {
      var typeEl = document.getElementById('sde-type');
      var expEl = document.getElementById('sde-exp');
      var complexEl = document.getElementById('sde-complex');
      var expVal = document.getElementById('sde-exp-val');
      var complexVal = document.getElementById('sde-complex-val');
      var baseDurations = {
        haircut: 30, color: 90, massage: 60, facial: 50, consultation: 30,
        dental: 45, manicure: 30, pedicure: 45, waxing: 20, tattoo: 120
      };
      var baseBuffers = {
        haircut: 10, color: 15, massage: 15, facial: 10, consultation: 5,
        dental: 15, manicure: 5, pedicure: 10, waxing: 5, tattoo: 20
      };
      function calc() {
        var type = typeEl.value;
        var exp = parseInt(expEl.value);
        var complex = parseInt(complexEl.value);
        var expLabels = {1: 'Beginner', 2: 'Intermediate', 3: 'Expert'};
        var complexLabels = {1: 'Simple', 2: 'Moderate', 3: 'Complex'};
        expVal.textContent = expLabels[exp];
        complexVal.textContent = complexLabels[complex];
        var expMultiplier = {1: 1.3, 2: 1.0, 3: 0.85};
        var complexMultiplier = {1: 0.75, 2: 1.0, 3: 1.4};
        var base = baseDurations[type] || 30;
        var duration = Math.round(base * expMultiplier[exp] * complexMultiplier[complex]);
        duration = Math.round(duration / 5) * 5;
        var buffer = Math.round((baseBuffers[type] || 10) * (complex === 3 ? 1.5 : 1));
        buffer = Math.round(buffer / 5) * 5;
        var total = duration + buffer;
        document.getElementById('sde-duration').textContent = duration;
        document.getElementById('sde-buffer').textContent = buffer;
        document.getElementById('sde-total').textContent = total;
      }
      [typeEl, expEl, complexEl].forEach(function(el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
      calc();
    })();
  </script>`;
  return wrapPage(head, body);
}

export function qrCodeGenerator(): string {
  const title = `Free Custom QR Code Generator | ${BRAND}`;
  const description = `Create high-quality, custom QR codes for your business. Perfect for booking links, menus, and business cards. Free tool by ${BRAND}.`;
  const canonical = `${DOMAIN}/tools/qr-code-generator`;
  const keywords = "qr code generator, free qr code, custom qr code, booking qr code, business qr code";
  const ctaUrl = utmLink("seo", "tool", "qr-code-generator");
  const head = headTags(title, description, canonical, keywords);

  const body = `
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    ${breadcrumbs([
      { label: "Home", href: "/seo" },
      { label: "Free Tools", href: "/tools" },
      { label: "QR Code Generator" },
    ])}

    <section class="mb-12">
      <h1 class="font-heading text-4xl sm:text-5xl font-semibold mb-6 leading-tight">
        Custom QR Code<br><span class="text-silver">Generator</span>
      </h1>
      <p class="text-silver text-lg max-w-2xl leading-relaxed">
        Generate professional QR codes for your booking links, website, or digital menu. Download and use them anywhere.
      </p>
    </section>

    <section class="glass-card rounded-3xl p-8 sm:p-12 mb-16">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div class="space-y-6">
          <div>
            <label class="block text-pearl font-medium mb-2 text-sm" for="qr-text">URL or Text</label>
            <input type="text" id="qr-text" placeholder="https://your-booking-link.com" 
              class="w-full bg-graphite border border-white/10 rounded-xl px-4 py-3 text-pearl text-lg focus:outline-none focus:border-pearl/30 transition-colors">
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-pearl font-medium mb-2 text-sm" for="qr-color">QR Color</label>
              <input type="color" id="qr-color" value="#f5f5f7" class="w-full h-12 bg-graphite border border-white/10 rounded-xl px-1 py-1 cursor-pointer">
            </div>
            <div>
              <label class="block text-pearl font-medium mb-2 text-sm" for="qr-bg">Background</label>
              <input type="color" id="qr-bg" value="#000000" class="w-full h-12 bg-graphite border border-white/10 rounded-xl px-1 py-1 cursor-pointer">
            </div>
          </div>

          <div class="pt-4">
            <button id="qr-download" class="cta-btn w-full text-center">Download PNG</button>
          </div>
        </div>

        <div class="flex flex-col items-center justify-center p-8 bg-black/40 rounded-2xl border border-white/5 min-h-[300px]">
          <div id="qr-canvas-container" class="bg-white p-4 rounded-xl shadow-2xl">
            <canvas id="qr-canvas"></canvas>
          </div>
          <p class="text-silver text-xs mt-6">Preview updates instantly as you type</p>
        </div>
      </div>
    </section>

    <section class="text-center py-12">
      <div class="glass-card rounded-3xl p-12">
        <h2 class="font-heading text-3xl sm:text-4xl font-semibold mb-4">Get More Bookings with QR Codes</h2>
        <p class="text-silver text-lg mb-8 max-w-xl mx-auto">${BRAND} automatically generates QR codes for every business. Print them on your front door and let clients book in seconds.</p>
        <a href="${ctaUrl}" class="cta-btn">Start Free Today</a>
      </div>
    </section>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
  <script>
    (function() {
      const textInput = document.getElementById('qr-text');
      const colorInput = document.getElementById('qr-color');
      const bgInput = document.getElementById('qr-bg');
      const canvas = document.getElementById('qr-canvas');
      const downloadBtn = document.getElementById('qr-download');

      function generate() {
        const text = textInput.value || 'https://confirmbooking.online';
        const color = colorInput.value;
        const bg = bgInput.value;

        QRCode.toCanvas(canvas, text, {
          width: 256,
          margin: 1,
          color: {
            dark: color,
            light: bg
          }
        }, function(error) {
          if (error) console.error(error);
        });
      }

      textInput.addEventListener('input', generate);
      colorInput.addEventListener('input', generate);
      bgInput.addEventListener('input', generate);
      
      downloadBtn.addEventListener('click', function() {
        const link = document.createElement('a');
        link.download = 'bookflow-qr-code.png';
        link.href = canvas.toDataURL();
        link.click();
      });

      generate();
    })();
  </script>`;

  return wrapPage(head, body);
}

export const TOOLS_LIST: { slug: string; name: string; description: string; icon: string; fn: () => string }[] = [
  { slug: "qr-code-generator", name: "QR Code Generator", description: "Create custom QR codes for your booking links and marketing materials.", icon: "QR", fn: qrCodeGenerator },
  { slug: "revenue-per-chair", name: "Revenue Per Chair Calculator", description: "Calculate daily, monthly, and annual revenue per chair or station.", icon: "$", fn: revenuePerChairCalculator },
  { slug: "service-pricing", name: "Service Pricing Calculator", description: "Find the ideal price for your services based on costs and profit margin.", icon: "$", fn: servicePricingCalculator },
  { slug: "hourly-rate", name: "Hourly Rate Calculator", description: "Determine the hourly rate needed to reach your income goals.", icon: "$", fn: hourlyRateCalculator },
  { slug: "tip-calculator", name: "Tip Calculator", description: "Estimate your tip income per service, daily, monthly, and annually.", icon: "$", fn: tipCalculator },
  { slug: "break-even", name: "Break-Even Calculator", description: "Find how many bookings you need to cover your fixed costs.", icon: "#", fn: breakEvenCalculator },
  { slug: "booking-capacity", name: "Booking Capacity Calculator", description: "Calculate max daily, weekly, and monthly appointment capacity.", icon: "#", fn: bookingCapacityCalculator },
  { slug: "staff-scheduling", name: "Staff Scheduling Calculator", description: "Determine the optimal number of staff per shift.", icon: "#", fn: staffSchedulingCalculator },
  { slug: "timezone-converter", name: "Time Zone Converter", description: "Convert appointment times between time zones instantly.", icon: "~", fn: timeZoneConverter },
  { slug: "appointment-buffer", name: "Appointment Buffer Calculator", description: "Calculate the ideal buffer time between appointments.", icon: "~", fn: appointmentBufferCalculator },
  { slug: "client-lifetime-value", name: "Client Lifetime Value Calculator", description: "Discover the total value of each client over their lifetime.", icon: "$", fn: clientLifetimeValueCalculator },
  { slug: "client-retention-rate", name: "Client Retention Rate Calculator", description: "Measure how well your business retains clients.", icon: "%", fn: clientRetentionRateCalculator },
  { slug: "rebooking-rate", name: "Rebooking Rate Calculator", description: "Track your 30, 60, and 90 day rebooking rates.", icon: "%", fn: rebookingRateCalculator },
  { slug: "marketing-roi", name: "Marketing ROI Calculator", description: "Calculate the return on investment for your marketing spend.", icon: "$", fn: marketingRoiCalculator },
  { slug: "email-open-rate", name: "Email Open Rate Benchmark", description: "Compare your email rates against industry averages.", icon: "%", fn: emailOpenRateBenchmark },
  { slug: "cancellation-cost", name: "Cancellation Cost Calculator", description: "See how much revenue you lose to cancellations.", icon: "$", fn: cancellationCostCalculator },
  { slug: "deposit-calculator", name: "Deposit Amount Calculator", description: "Find the optimal deposit amount to reduce no-shows.", icon: "$", fn: depositAmountCalculator },
  { slug: "utilization-rate", name: "Utilization Rate Calculator", description: "Measure your booking utilization against the 85% benchmark.", icon: "%", fn: utilizationRateCalculator },
  { slug: "revenue-per-hour", name: "Revenue Per Hour Calculator", description: "Compare revenue per hour across your services.", icon: "$", fn: revenuePerHourCalculator },
  { slug: "business-hours-optimizer", name: "Business Hours Optimizer", description: "Analyze if extending your hours could increase revenue.", icon: "~", fn: businessHoursOptimizer },
  { slug: "service-duration", name: "Service Duration Estimator", description: "Get recommended service durations based on type and complexity.", icon: "~", fn: serviceDurationEstimator },
];
