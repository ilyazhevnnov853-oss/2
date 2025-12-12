export const FIRE_LOADS = {
    // Теплота сгорания (Qнср, МДж/кг) и линейная скорость выгорания
    Office_Furniture: { 
        name: 'Мебель и бытовые изделия (Офис)', 
        heat: 13.8, // МДж/кг
        smoke_generation: 0.05, // Нп
        linear_burn_speed: 0.015 
    },
    Paper_Books: { 
        name: 'Бумага, книги (Библиотека/Архив)', 
        heat: 17.0, 
        smoke_generation: 0.08, 
        linear_burn_speed: 0.011 
    },
    Car_Parking: { 
        name: 'Автомобили (Парковка)', 
        heat: 34.0, // Бензин/масло/пластик
        smoke_generation: 0.12, 
        linear_burn_speed: 0.02 
    },
    Wood: { 
        name: 'Древесина', 
        heat: 13.8, 
        smoke_generation: 0.04, 
        linear_burn_speed: 0.02 
    },
    Cable_Isolation: { 
        name: 'Изоляция кабелей (ПВХ)', 
        heat: 20.0, 
        smoke_generation: 0.15, 
        linear_burn_speed: 0.01 
    }
};

export const BUILD_TYPES = {
    Residential: { name: 'Жилое здание', coef: 1.0 },
    Public: { name: 'Общественное здание', coef: 1.2 },
    Production: { name: 'Производственное', coef: 1.3 }
};