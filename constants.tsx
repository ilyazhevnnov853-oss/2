import React from 'react';
import { AlignVerticalJustifyCenter, MoveVertical, ArrowDown, Grid, Box, RotateCcw } from 'lucide-react';
import { SpecMap, EngineeringData, DiffuserModel, WikiItem, NormItem, SymbolItem } from './types';

export const CONSTANTS = {
  DEFAULT_ROOM_HEIGHT: 3.5,
  BASE_TIME_STEP: 1/60, 
  HISTORY_RECORD_INTERVAL: 0.015,
};

// ==========================================
// 1. ENGINEERING DATABASE (EQUIPMENT)
// ==========================================

export const SPECS: SpecMap = {
  // Circular
  100: { f0: 0.007, A: 99,  B: 140, C: 16, D: 55,  min: 30,  max: 150 },
  125: { f0: 0.011, A: 124, B: 170, C: 16, D: 55,  min: 40,  max: 250 },
  160: { f0: 0.018, A: 159, B: 215, C: 60, D: 60,  min: 70,  max: 400 },
  200: { f0: 0.029, A: 198, B: 258, C: 60, D: 60,  min: 120, max: 600 },
  250: { f0: 0.046, A: 248, B: 308, C: 60, D: 65,  min: 200, max: 900 },
  315: { f0: 0.075, A: 313, B: 390, C: 70, D: 70,  min: 300, max: 1200 },
  400: { f0: 0.120, A: 398, B: 490, C: 80, D: 80,  min: 500, max: 2000 },
  
  // Rectangular Grilles (Equivalent diameters)
  "200x100": { f0: 0.014, A: 200, B: 100, C: 40, D: 40, min: 50, max: 300 },
  "300x100": { f0: 0.022, A: 300, B: 100, C: 40, D: 40, min: 80, max: 450 },
  "400x150": { f0: 0.045, A: 400, B: 150, C: 50, D: 50, min: 150, max: 800 },
  "500x200": { f0: 0.075, A: 500, B: 200, C: 60, D: 60, min: 250, max: 1200 },
  "600x300": { f0: 0.138, A: 600, B: 300, C: 70, D: 70, min: 500, max: 2000 },

  // Square Ceiling (4AP)
  "450x450": { f0: 0.035, A: 450, B: 450, C: 60, D: 60, min: 200, max: 800 },
  "600x600": { f0: 0.056, A: 595, B: 595, C: 80, D: 80, min: 350, max: 1500 },
};

export const ENGINEERING_DATA: EngineeringData = {
  'dpu-v': {
    'vertical-swirl': {
      100: [{vol:35, pa:18, db:20, throw:2.1}, {vol:60, pa:54, db:35, throw:3.6}, {vol:85, pa:109, db:45, throw:5.2}],
      125: [{vol:45, pa:15, db:20, throw:2.1}, {vol:90, pa:62, db:35, throw:4.3}, {vol:120, pa:110, db:45, throw:5.7}],
      160: [{vol:75, pa:20, db:20, throw:2.8}, {vol:160, pa:91, db:35, throw:6.0}, {vol:200, pa:143, db:45, throw:7.5}],
      200: [{vol:130, pa:28, db:20, throw:3.8}, {vol:210, pa:73, db:35, throw:6.2}, {vol:245, pa:99, db:45, throw:7.2}]
    }
  },
  'dpu-m': {
    'vertical-conical': {
      100: [{vol:80, pa:16, db:20, throw:2.0}, {vol:150, pa:55, db:35, throw:3.7}, {vol:200, pa:98, db:45, throw:5.0}],
      125: [{vol:130, pa:17, db:20, throw:2.6}, {vol:250, pa:62, db:35, throw:5.0}, {vol:350, pa:122, db:45, throw:7.0}],
      160: [{vol:180, pa:12, db:20, throw:2.8}, {vol:450, pa:75, db:35, throw:7.0}, {vol:620, pa:143, db:45, throw:9.6}],
      200: [{vol:250, pa:9, db:20, throw:3.1}, {vol:600, pa:52, db:35, throw:7.3}, {vol:800, pa:92, db:45, throw:9.8}],
      250: [{vol:350, pa:7, db:20, throw:3.4}, {vol:990, pa:56, db:35, throw:9.6}, {vol:1350, pa:104, db:45, throw:13.0}]
    }
  },
  'dpu-k': {
    'vertical-conical': {
      100: [{vol:90, pa:17, db:20, throw:2.2}, {vol:210, pa:92, db:45, throw:5.2}],
      125: [{vol:110, pa:10, db:20, throw:2.2}, {vol:260, pa:57, db:45, throw:5.2}],
      160: [{vol:180, pa:10, db:20, throw:2.8}, {vol:460, pa:67, db:45, throw:7.2}],
      200: [{vol:280, pa:9, db:20, throw:3.4}, {vol:640, pa:50, db:45, throw:7.8}],
      250: [{vol:390, pa:7, db:20, throw:3.8}, {vol:980, pa:46, db:45, throw:9.5}]
    }
  },
  'dpu-s': {
    'vertical-compact': {
      125: [{vol:60, pa:14, db:20, throw:2.7}, {vol:150, pa:86, db:45, throw:6.8}],
      160: [{vol:80, pa:9, db:20, throw:2.8}, {vol:220, pa:69, db:45, throw:7.7}],
      200: [{vol:120, pa:8, db:20, throw:3.3}, {vol:330, pa:60, db:45, throw:9.2}],
      250: [{vol:180, pa:7, db:20, throw:4.0}, {vol:480, pa:50, db:45, throw:11.0}]
    }
  },
  'amn-adn': { 
    'horizontal-compact': {
      "200x100": [{vol:100, pa:10, db:20, throw:3.0}, {vol:200, pa:30, db:35, throw:6.0}],
      "300x100": [{vol:150, pa:10, db:20, throw:3.5}, {vol:300, pa:35, db:35, throw:7.0}],
      "400x150": [{vol:300, pa:12, db:25, throw:5.0}, {vol:600, pa:40, db:40, throw:10.0}],
      "500x200": [{vol:500, pa:15, db:25, throw:6.0}, {vol:1000, pa:45, db:40, throw:12.0}],
      "600x300": [{vol:1000, pa:15, db:25, throw:8.0}, {vol:2000, pa:50, db:45, throw:16.0}]
    }
  },
  '4ap': {
    '4-way': {
      "450x450": [{vol:300, pa:8, db:25, throw:2.0}, {vol:600, pa:30, db:35, throw:4.0}],
      "600x600": [{vol:500, pa:10, db:25, throw:2.5}, {vol:1000, pa:35, db:40, throw:5.0}]
    }
  },
  'dpu-o': { 
    'suction': {
      100: [{vol:50, pa:10, db:20, throw:0}, {vol:100, pa:30, db:35, throw:0}],
      125: [{vol:80, pa:10, db:20, throw:0}, {vol:150, pa:30, db:35, throw:0}],
      160: [{vol:120, pa:12, db:20, throw:0}, {vol:250, pa:35, db:35, throw:0}],
      200: [{vol:200, pa:15, db:20, throw:0}, {vol:400, pa:40, db:35, throw:0}]
    }
  }
};

export const DIFFUSER_CATALOG: DiffuserModel[] = [
    { 
        id: 'dpu-m', series: 'ДПУ-М', name: 'Универсальный',
        modes: [
            { id: 'm-vert', name: 'Коническая', subtitle: 'Вертикальная', b_text: 'b = 0.2A', flowType: 'vertical-conical', icon: <AlignVerticalJustifyCenter size={16}/> }
        ]
    },
    { 
        id: 'dpu-k', series: 'ДПУ-К', name: 'Веерный',
        modes: [
            { id: 'k-vert', name: 'Коническая', subtitle: 'Вертикальная', b_text: 'b = 0.1A', flowType: 'vertical-conical', icon: <AlignVerticalJustifyCenter size={16}/> }
        ]
    },
    { 
        id: 'dpu-v', series: 'ДПУ-В', name: 'Вихревой',
        modes: [
            { id: 'v-vert', name: 'Вихревая', subtitle: 'Вертикальная', b_text: 'b = 0 мм', flowType: 'vertical-swirl', icon: <MoveVertical size={16}/> }
        ]
    },
    { 
        id: 'dpu-s', series: 'ДПУ-С', name: 'Сопловой',
        modes: [
            { id: 's-vert', name: 'Компактная', subtitle: 'Вертикальная', b_text: 'b = const', flowType: 'vertical-compact', icon: <ArrowDown size={16}/> }
        ]
    },
    {
        id: 'amn-adn', series: 'АДН/АМН', name: 'Решетка',
        modes: [
            { id: 'adn-horiz', name: 'Компактная', subtitle: 'Настенная', b_text: 'прямая', flowType: 'horizontal-compact', icon: <Grid size={16}/> }
        ]
    },
    {
        id: '4ap', series: '4АП', name: 'Потолочный',
        modes: [
            { id: '4ap-4way', name: '4-сторонняя', subtitle: 'Веерная', b_text: '360°', flowType: '4-way', icon: <Box size={16}/> }
        ]
    },
    {
        id: 'dpu-o', series: 'ДПУ-О', name: 'Вытяжной',
        modes: [
            { id: 'exhaust-mode', name: 'Всасывание', subtitle: 'Вытяжка', b_text: '-', flowType: 'suction', icon: <RotateCcw size={16}/> }
        ]
    }
];

// Helper components for Wiki - ESTHETICALLY ENHANCED
const Var = ({c}: {c: string}) => <span className="font-serif italic text-blue-200 font-semibold tracking-wide text-xl">{c}</span>;
const Num = ({c}: {c: string}) => <span className="font-mono text-emerald-300 font-bold text-lg">{c}</span>;
const Op = ({c}: {c: string}) => <span className="mx-2 text-slate-400 font-medium opacity-80 text-xl">{c}</span>;
const Text = ({c}: {c: string}) => <span className="text-slate-300 font-sans mx-1 text-base">{c}</span>;
const Sub = ({children}: {children: React.ReactNode}) => <sub className="text-xs text-slate-400 ml-0.5">{children}</sub>;
const Sup = ({children}: {children: React.ReactNode}) => <sup className="text-xs text-slate-400 ml-0.5">{children}</sup>;

const Frac = ({num, den}: {num: React.ReactNode, den: React.ReactNode}) => (
    <div className="inline-flex flex-col items-center align-middle mx-2" style={{verticalAlign: 'middle'}}>
        <div className="border-b-2 border-white/20 px-3 pb-1 mb-1 text-center w-full">{num}</div>
        <div className="px-2 text-center w-full">{den}</div>
    </div>
);

export const ENGINEERING_WIKI: WikiItem[] = [
  {
    id: "vent_aero_friction",
    category: "Аэродинамика",
    title: "Потери давления на трение",
    content_blocks: [
      { type: "text", content: "Потери давления по длине воздуховода возникают из-за вязкости воздуха и трения о стенки канала. Их можно вычислить по классической формуле Дарси-Вейсбаха:" },
      { type: "custom_formula", render: () => (
          <div className="flex items-center justify-center p-6">
             <Var c="Δp"/><Sub>tr</Sub> <Op c="="/> <Var c="λ"/> <Op c="·"/> <Frac num={<Var c="l"/>} den={<Var c="d"/>} /> <Op c="·"/> <Frac num={<><Var c="ρ"/> <Op c="·"/> <Var c="v"/><Sup>2</Sup></>} den={<Num c="2"/>} />
          </div>
      )},
      { type: "variable_list", items: [
          {symbol: <Var c="l"/>, definition: "длина участка воздуховода, м"},
          {symbol: <Var c="d"/>, definition: "диаметр воздуховода, м"},
          {symbol: <Var c="λ"/>, definition: "коэффициент трения"},
          {symbol: <Var c="ρ"/>, definition: "плотность воздуха (1.2 кг/м³)"},
          {symbol: <Var c="v"/>, definition: "средняя скорость потока, м/с"}
      ]},
      { type: "text", content: "Для воздуховодов прямоугольного сечения используется эквивалентный диаметр:" },
      { type: "custom_formula", render: () => (
          <div className="flex items-center justify-center p-6">
             <Var c="d"/><Sub>eq</Sub> <Op c="="/> <Frac num={<><Num c="2"/><Op c="·"/><Var c="a"/><Op c="·"/><Var c="b"/></>} den={<><Var c="a"/><Op c="+"/><Var c="b"/></>} />
          </div>
      )}
    ]
  },
  {
    id: "vent_aero_local",
    category: "Аэродинамика",
    title: "Местные сопротивления",
    content_blocks: [
      { type: "text", content: "Местные потери давления возникают в фасонных элементах (отводы, тройники) из-за изменения скорости или направления потока:" },
      { type: "custom_formula", render: () => (
          <div className="flex items-center justify-center p-6">
             <Var c="Δp"/><Sub>loc</Sub> <Op c="="/> <Var c="ξ"/> <Op c="·"/> <Frac num={<><Var c="ρ"/> <Op c="·"/> <Var c="v"/><Sup>2</Sup></>} den={<Num c="2"/>} />
          </div>
      )},
      { type: "variable_list", items: [
          {symbol: <Var c="ξ"/>, definition: "коэффициент местного сопротивления (КМС)"},
          {symbol: <Var c="ρ"/>, definition: "плотность воздуха, кг/м³"},
          {symbol: <Var c="v"/>, definition: "скорость воздуха в сечении, м/с"}
      ]}
    ]
  },
  {
    id: "vent_exchange",
    category: "Вентиляция",
    title: "Расчет воздухообмена",
    content_blocks: [
      { type: "text", content: "Необходимый воздухообмен в помещении определяется по кратности или по количеству людей. Расчет по кратности:" },
      { type: "custom_formula", render: () => (
          <div className="flex items-center justify-center p-6">
             <Var c="L"/> <Op c="="/> <Var c="V"/><Sub>room</Sub> <Op c="·"/> <Var c="n"/>
          </div>
      )},
       { type: "variable_list", items: [
          {symbol: <Var c="L"/>, definition: "расход воздуха, м³/ч"},
          {symbol: <><Var c="V"/><Sub>room</Sub></>, definition: "объем помещения, м³"},
          {symbol: <Var c="n"/>, definition: "кратность воздухообмена (1/ч)"}
      ]},
      { type: "text", content: "Расчет по количеству людей:" },
      { type: "custom_formula", render: () => (
          <div className="flex items-center justify-center p-6">
             <Var c="L"/> <Op c="="/> <Var c="N"/><Sub>ppl</Sub> <Op c="·"/> <Var c="L"/><Sub>norm</Sub>
          </div>
      )},
       { type: "variable_list", items: [
          {symbol: <><Var c="N"/><Sub>ppl</Sub></>, definition: "количество людей"},
          {symbol: <><Var c="L"/><Sub>norm</Sub></>, definition: "норма воздуха на 1 чел (обычно 60 м³/ч)"}
      ]}
    ]
  },
  {
      id: "heater_calc",
      category: "Отопление",
      title: "Мощность калорифера",
      content_blocks: [
          { type: "text", content: "Мощность, необходимая для нагрева приточного воздуха, рассчитывается по формуле:" },
          { type: "custom_formula", render: () => (
              <div className="flex items-center justify-center p-6 flex-wrap gap-y-4">
                  <Var c="Q"/><Sub>w</Sub> <Op c="="/> <Num c="0.278"/> <Op c="·"/> <Var c="L"/> <Op c="·"/> <Var c="ρ"/> <Op c="·"/> <Var c="c"/> <Op c="·"/> <Text c="(" /><Var c="t"/><Sub>out</Sub> <Op c="-"/> <Var c="t"/><Sub>in</Sub><Text c=")" />
              </div>
          )},
          { type: "variable_list", items: [
              {symbol: <><Var c="Q"/><Sub>w</Sub></>, definition: "тепловая мощность, Вт"},
              {symbol: <Var c="L"/>, definition: "расход воздуха, м³/ч"},
              {symbol: <Var c="ρ"/>, definition: "плотность воздуха (1.2 кг/м³)"},
              {symbol: <Var c="c"/>, definition: "теплоемкость воздуха (1.006 кДж/кг·°C)"},
              {symbol: <><Var c="t"/><Sub>out</Sub></>, definition: "температура на выходе, °C"},
              {symbol: <><Var c="t"/><Sub>in</Sub></>, definition: "температура на входе, °C"}
          ]}
      ]
  },
  {
      id: "acoustics_basic",
      category: "Акустика",
      title: "Суммирование шума",
      content_blocks: [
          { type: "text", content: "При наличии нескольких источников шума общий уровень звукового давления рассчитывается логарифмически:" },
          { type: "custom_formula", render: () => (
              <div className="flex items-center justify-center p-6">
                  <Var c="L"/><Sub>sum</Sub> <Op c="="/> <Num c="10"/> <Op c="·"/> <Text c="lg"/> <Text c="("/> 
                  <Text c="∑"/> <Num c="10"/> <Sup><Text c="0.1·L"/><i>i</i></Sup>
                  <Text c=")"/>
              </div>
          )},
          { type: "text", content: "Если два источника имеют одинаковый уровень шума, общий уровень увеличивается на 3 дБ." }
      ]
  }
];

export const NORMS_DB: NormItem[] = [
    { 
        code: 'СП 60.13330.2020', 
        title: 'Отопление, вентиляция и кондиционирование воздуха', 
        status: 'Действующий', 
        desc: 'Главный документ проектировщика ОВиК. Содержит требования к параметрам микроклимата.' 
    },
    { 
        code: 'СП 7.13130.2013', 
        title: 'Требования пожарной безопасности', 
        status: 'Действующий', 
        desc: 'Регламентирует системы противодымной вентиляции и огнестойкость.' 
    },
    { 
        code: 'ГОСТ 30494-2011', 
        title: 'Здания жилые и общественные', 
        status: 'Действующий', 
        desc: 'Параметры микроклимата в помещениях.' 
    }
];

export const AVOK_SYMBOLS: SymbolItem[] = [
  {
    id: 'fan_radial',
    category: 'Оборудование',
    title: 'Вентилятор Радиальный',
    desc: 'Вентилятор центробежный общего назначения',
    draw: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
        <circle cx="12" cy="12" r="9" className="text-slate-500" />
        <path d="M12 12L18.36 18.36" />
        <path d="M12 12L5.64 5.64" />
        <path d="M12 12L18.36 5.64" />
        <path d="M12 12L5.64 18.36" />
      </svg>
    )
  },
  {
    id: 'fan_axial',
    category: 'Оборудование',
    title: 'Вентилятор Осевой',
    desc: 'Вентилятор с осевым направлением потока',
    draw: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
        <circle cx="12" cy="12" r="9" className="text-slate-500"/>
        <path d="M12 3V21" />
        <path d="M8 8L16 16" />
        <path d="M16 8L8 16" />
      </svg>
    )
  },
  {
    id: 'filter',
    category: 'Элементы',
    title: 'Фильтр',
    desc: 'Воздушный фильтр (Ф)',
    draw: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
         <rect x="2" y="6" width="20" height="12" rx="1" className="text-slate-500" />
         <path d="M6 6L18 18" strokeDasharray="2 2" />
         <path d="M18 6L6 18" strokeDasharray="2 2" />
      </svg>
    )
  },
  {
      id: 'heater_water',
      category: 'Теплообменники',
      title: 'Воздухонагреватель',
      desc: 'Калорифер водяной',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
            <rect x="2" y="4" width="20" height="16" className="text-slate-500" />
            <path d="M4 16L8 8L12 16L16 8L20 16" />
        </svg>
      )
  },
   {
      id: 'cooler',
      category: 'Теплообменники',
      title: 'Воздухоохладитель',
      desc: 'Секция охлаждения',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
            <rect x="2" y="4" width="20" height="16" className="text-slate-500" />
            <path d="M12 4V20" />
            <path d="M6 10H18" />
            <path d="M6 14H18" />
        </svg>
      )
  },
  {
      id: 'damper',
      category: 'Арматура',
      title: 'Заслонка',
      desc: 'Клапан воздушный регулирующий',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <rect x="4" y="8" width="16" height="8" className="text-slate-500"/>
             <path d="M4 16L20 8" />
             <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
        </svg>
      )
  },
  {
      id: 'damper_fire',
      category: 'Арматура',
      title: 'Клапан ОЗК',
      desc: 'Огнезадерживающий клапан',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <rect x="4" y="6" width="16" height="12" className="text-slate-500"/>
             <path d="M4 6L20 18" />
             <path d="M20 6L4 18" />
        </svg>
      )
  },
    {
      id: 'silencer',
      category: 'Элементы',
      title: 'Шумоглушитель',
      desc: 'Секция шумоглушения',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <rect x="2" y="8" width="20" height="8" className="text-slate-500"/>
             <path d="M6 8L18 16" />
             <path d="M6 16L18 8" />
        </svg>
      )
  },
  {
      id: 'check_valve',
      category: 'Арматура',
      title: 'Обратный клапан',
      desc: 'Клапан, пропускающий воздух в одном направлении',
      draw: () => (
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <rect x="4" y="6" width="16" height="12" className="text-slate-500"/>
             <path d="M12 6V18" />
             <path d="M12 6L16 12H8L12 6Z" fill="currentColor"/>
         </svg>
      )
  },
  {
      id: 'sensor_temp',
      category: 'Автоматика',
      title: 'Датчик (TE)',
      desc: 'Датчик температуры (Temperature Element)',
      draw: () => (
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <circle cx="12" cy="12" r="8" className="text-slate-500"/>
             <text x="12" y="15" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">TE</text>
         </svg>
      )
  },
  {
      id: 'sensor_press',
      category: 'Автоматика',
      title: 'Датчик (PE)',
      desc: 'Датчик давления (Pressure Element)',
      draw: () => (
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
             <circle cx="12" cy="12" r="8" className="text-slate-500"/>
             <text x="12" y="15" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">PE</text>
         </svg>
      )
  },
  {
      id: 'heat_exchanger',
      category: 'Теплообменники',
      title: 'Рекуператор',
      desc: 'Пластинчатый теплообменник',
      draw: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16">
            <rect x="4" y="4" width="16" height="16" className="text-slate-500"/>
            <path d="M4 4L20 20" />
            <path d="M20 4L4 20" />
        </svg>
      )
  }
];