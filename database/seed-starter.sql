-- Starter sample only; not an exhaustive roster. No image is enabled until rights status is reviewed.
insert into cards (id,series_id,character_name,points,rarity,drop_weight,image_rights_status) values
('naruto-uzumaki','naruto','Naruto Uzumaki',950,'Mythic',15,'needs-review'),
('sasuke-uchiha','naruto','Sasuke Uchiha',940,'Mythic',15,'needs-review'),
('light-yagami','death-note','Light Yagami',760,'Legendary',100,'needs-review'),
('ryuk','death-note','Ryuk',710,'Legendary',100,'needs-review'),
('satoru-gojo','jujutsu-kaisen','Satoru Gojo',1000,'Mythic',10,'needs-review'),
('yuji-itadori','jujutsu-kaisen','Yuji Itadori',960,'Mythic',15,'needs-review'),
('monkey-d-luffy','one-piece','Monkey D. Luffy',990,'Mythic',15,'needs-review'),
('roronoa-zoro','one-piece','Roronoa Zoro',900,'Legendary',100,'needs-review'),
('thorfinn','vinland-saga','Thorfinn',820,'Legendary',100,'needs-review'),
('izuku-midoriya','my-hero-academia','Izuku Midoriya',900,'Legendary',100,'needs-review'),
('tanjiro-kamado','demon-slayer','Tanjiro Kamado',880,'Legendary',100,'needs-review'),
('saitama','one-punch-man','Saitama',980,'Mythic',15,'needs-review'),
('pikachu','pokemon','Pikachu',800,'Legendary',100,'needs-review'),
('eren-yeager','attack-on-titan','Eren Yeager',930,'Mythic',20,'needs-review')
on conflict (id) do nothing;