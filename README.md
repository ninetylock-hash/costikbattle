# Costik Battle 2.2

Install: `npm install`, then `npm start`.

Render Build Command: `npm install`; Start Command: `npm start`.
Environment: `BASE_URL=https://costikbattle.onrender.com`, `NODE_ENV=production`, `SESSION_SECRET` (long random value), `STEAM_API_KEY`.

Included: 20 virtual cases, Steam OpenID login, server-side case drops, virtual inventory, selling for virtual coins, proportional server-side upgrades. Skin pictures are fetched from the community CSGO-API dataset when matching names exist.

Important: case/item values in this MVP are sample virtual values, not live Steam Market quotes. Items cannot be withdrawn or traded. JSON user storage is ephemeral on Render free instances; data may be lost on restart/redeploy. Use persistent database/storage before treating inventories as durable.


## Обновление интерфейса 2.1

- В кейсах используются индивидуальные веса выпадения (65 / 25 / 8 / 2%).
- Для скинов и контейнеров загружаются изображения из открытого CSGO-API (ByMykel / Counter-Strike image tracker).
- Апгрейд показывает круглое колесо с сектором шанса и результатом без горизонтальной рулетки.
- Цены и вероятности — демонстрационные значения виртуальной экономики, не реальные рыночные котировки и не гарантия окупаемости.

Для корректной загрузки картинок браузеру нужен доступ к `raw.githubusercontent.com`. Если источник временно недоступен, сайт продолжит работать, но изображения могут не появиться.


## Обновление 2.2

- Каталог и страницы кейсов показывают ожидаемый возврат (EV), ROI и метку «потенциальный окуп / неокуп».
- Для разных кейсов применяются разные профили вероятностей выпадения; сумма шансов в каждом кейсе равна 100%.
- Карточки дропа показывают точный шанс каждого предмета.
- Апгрейд использует круговое колесо с сектором успеха/неудачи и останавливается на фактическом серверном результате.
- Добавлены быстрые пресеты x2 / x5 / x10 и шансы 30% / 50% / 75%.
- Подбор изображений скинов стал точнее; изображения берутся из открытого CS2-API, изображения кейсов — из каталога кейсов.

Все балансы, цены и предметы в этой сборке демонстрационные и виртуальные. Внешние изображения требуют подключения к интернету.
