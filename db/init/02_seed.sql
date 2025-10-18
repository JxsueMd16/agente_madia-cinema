-- Géneros base
INSERT INTO generos (nombre) VALUES
('Acción'), ('Aventura'), ('Drama'), ('Ciencia ficción'),
('Comedia'), ('Animación'), ('Suspenso'), ('Fantasía'),
('Romance'), ('Thriller'), ('Musical'), ('Terror')
ON CONFLICT (nombre) DO NOTHING;

-- Películas conocidas internacionales
INSERT INTO peliculas
(titulo, titulo_original, anio, fecha_estreno, duracion_min, clasificacion,
 calificacion, rating_avg, votos, descripcion, poster_url, backdrop_url,
 idioma_original, pais_origen, presupuesto_usd, ingresos_usd)
VALUES
-- Marvel
('Avengers: Endgame', 'Avengers: Endgame', 2019, '2019-04-26', 181, 'PG-13',
 9.2, 8.4, 1250000, 'Los Vengadores restantes deben encontrar una manera de recuperar a sus aliados para un enfrentamiento épico con Thanos, el malvado que diezmó el planeta y el universo.',
 'https://cdn.marvel.com/content/2x/MLou2_Payoff_1-Sht_Online_DOM_v7_Sm.jpg',
 'https://cdn.marvel.com/content/2x/MLou2_Teaser_1-Sht_v6_Lg.jpg',
 'en', 'US', 356000000, 2798000000),

('Spider-Man: No Way Home', 'Spider-Man: No Way Home', 2021, '2021-12-17', 148, 'PG-13',
 9.0, 8.2, 980000, 'Peter Parker es desenmascarado y ya no puede separar su vida normal de los enormes riesgos que conlleva ser un superhéroe. Cuando pide ayuda a Doctor Strange, los riesgos pasan a ser aún más peligrosos.',
 'https://m.media-amazon.com/images/I/91C3jBf3dfL._AC_SL1500_.jpg',
 'https://cdn.marvel.com/content/1x/snh_online_6072x9000_hero_03_opt.jpg',
 'en', 'US', 200000000, 1921000000),

-- Ciencia Ficción
('Interstellar', 'Interstellar', 2014, '2014-11-07', 169, 'PG-13',
 9.3, 8.6, 1800000, 'Un grupo de exploradores aprovecha un agujero de gusano recién descubierto para superar las limitaciones de los viajes espaciales tripulados y vencer las inmensas distancias que tiene un viaje interestelar.',
 'https://m.media-amazon.com/images/I/81kz06oSUeL._AC_SY879_.jpg',
 'https://m.media-amazon.com/images/I/91+2sZrFQIL._UF894,1000_QL80_.jpg',
 'en', 'US', 165000000, 677000000),

('Inception', 'Inception', 2010, '2010-07-16', 148, 'PG-13',
 9.1, 8.8, 2300000, 'Un ladrón que roba secretos corporativos a través del uso de la tecnología de compartir sueños, recibe la tarea inversa de plantar una idea en la mente del director de una empresa.',
 'https://m.media-amazon.com/images/I/71RotCbGTML.jpg',
 'https://m.media-amazon.com/images/I/71uKM+LdgFL.jpg',
 'en', 'US', 160000000, 829000000),

-- Romance/Musical
('La La Land', 'La La Land', 2016, '2016-12-09', 128, 'PG-13',
 8.8, 8.0, 580000, 'Mia, una aspirante a actriz, y Sebastian, un pianista de jazz dedicado, luchan por hacer realidad sus sueños en una ciudad conocida por destruir esperanzas y romper corazones.',
 'https://i5.walmartimages.com/seo/Rolled-Poster-La-La-Land-Movie-Laminated-24-x-36-Framed_20f02811-01b4-4aea-9bb2-a79942bd2642_1.856c035d66f8fd216f6d933259bc3dfb.jpeg',
 'https://lh5.googleusercontent.com/proxy/JIBVfHNtKuFGlBvYGYOnUTVoBVsMD9rQaX8w2aFbB6VOpKAcOrO6oE1qER-Em7XM__IfO1m-VbZ_KzTZbkKWuOlGWgyZgcrGftjb4ecXhxjp',
 'en', 'US', 30000000, 472000000),

('Yo antes de ti', 'Me Before You', 2016, '2016-06-03', 110, 'PG-13',
 8.2, 7.4, 245000, 'Una chica en una pequeña ciudad forma un vínculo improbable con un hombre recientemente paralizado al que está cuidando.',
 'https://filmartgallery.com/cdn/shop/products/Me-Before-You-Vintage-Movie-Poster-Original.jpg?v=1738910069',
 'https://mir-s3-cdn-cf.behance.net/project_modules/fs/c1d55484547933.603c4130c3f93.jpg',
 'en', 'US', 20000000, 208000000),

-- Drama/Familia
('La razón de estar contigo', 'A Dog''s Purpose', 2017, '2017-01-27', 100, 'PG',
 8.5, 7.2, 180000, 'Un perro busca el significado de su propia existencia a través de las vidas de los humanos que le enseñan lecciones sobre la vida, el amor y el propósito.',
 'https://m.media-amazon.com/images/M/MV5BMjExOWE5OTQtMGEwOS00ZjU2LTgyY2ItZWI0YzI0MzAyODAyXkEyXkFqcGc@._V1_.jpg',
 'https://tienda.sophosenlinea.com/imagenes/9788416/978841624092.webp',
 'en', 'US', 22000000, 205000000),

('Intensamente', 'Inside Out', 2015, '2015-06-19', 95, 'PG',
 9.0, 8.1, 750000, 'Después de que Riley y su familia se mudan a San Francisco, sus emociones lideran su comportamiento de maneras divertidas y significativas.',
 'https://purodiseno.lat/wp-content/uploads/2024/06/05INTENSAMENTE-PIXAR--691x1024.jpg',
 'https://i0.wp.com/img2.wikia.nocookie.net/__cb20141002165753/pixar/images/5/5c/The-inside-out-poster.jpg',
 'en', 'US', 175000000, 857000000),

-- Películas Guatemaltecas
('La Llorona', 'La Llorona', 2019, '2019-09-19', 97, 'R',
 8.7, 7.8, 15000, 'Un general retirado, responsable de un genocodio durante la guerra civil guatemalteca, es visitado por un espíritu que busca venganza.',
 'https://lacasadeproduccion.com.gt/wp-content/uploads/2024/02/la-llorona.jpg',
 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiinmsjxpx5Xsz38GVnBCADA-kZrdF2M_ZFoWaK6t-AhUMhcGe4tdWwNze6C6L68MTbNgOVnRcdjVpoKMOhKhK2hXzo8TeNsQr0tY0TOnrr3qUfei-xpRyU39ui63elRRNNJdRYvw/s1440/LaLloronaPoster.jpg',
 'es', 'GT', 500000, 1200000),

('Ixcanul', 'Ixcanul', 2015, '2015-02-09', 93, 'R',
 8.3, 7.2, 8500, 'En las faldas de un volcán activo en Guatemala, una adolescente kaqchikel de 17 años vive con sus padres en una plantación de café, donde sueña con descubrir el mundo al otro lado del océano.',
 'https://m.media-amazon.com/images/M/MV5BMGVlNzVhNjEtN2VlMi00ODEzLWJlNTgtYTFhMDM2MzZhNTI4XkEyXkFqcGc@._V1_.jpg',
 'https://shop.trigon-film.org/en/Posters_One_Sheet/Ixcanul/cover_full.jpg',
 'kaq', 'GT', 800000, 2500000),

('Nuestras Madres', 'Nuestras Madres', 2019, '2019-05-15', 77, 'R',
 7.8, 7.1, 4200, 'Ernesto es un joven antropólogo forense que trabaja identificando restos de víctimas de la guerra civil. Un día, una anciana mujer le pide ayuda para encontrar a su marido desaparecido.',
 'https://m.media-amazon.com/images/M/MV5BMTJlOWFkM2MtNGM1Mi00NGRhLWEzNmUtMjM1ZTMyZjNjMzlhXkEyXkFqcGc@._V1_.jpg',
 'https://pics.filmaffinity.com/nuestras_madres-211272136-large.jpg',
 'es', 'GT', 450000, 850000),

('El Regreso de Lencho', 'El Regreso de Lencho', 2010, '2010-08-20', 98, 'PG-13',
 7.2, 6.8, 2100, 'Lencho regresa a su pueblo natal después de años de ausencia para descubrir que todo ha cambiado, incluyendo el amor que dejó atrás.',
 'https://m.media-amazon.com/images/M/MV5BYmU0YWRlMjAtYjExNS00OTJiLTljOTEtNjVlZGU0MzBlMjI1XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg',
 'https://miro.medium.com/0*k_JqwaMqtEv70TAd.jpg',
 'es', 'GT', 300000, 650000),

-- Más internacionales populares
('El Niño y la Garza', 'The Boy and the Heron', 2023, '2023-07-14', 124, 'PG-13',
 8.9, 7.6, 125000, 'Un joven llamado Mahito anhela a su madre fallecida. Un día, una misteriosa garza parlante lo guía hacia una torre antigua, lo que lo lleva a un mundo fantástico compartido por los vivos y los muertos.',
 'https://image.tmdb.org/t/p/original/40Fv0wEEVKvLT2Xr2gc5CoBqf3t.jpg',
 'https://m.media-amazon.com/images/M/MV5BN2U0YzE5M2ItZGUwNi00YzJjLTkwYTAtNWFlZGJjNmFjYTIyXkEyXkFqcGc@._V1_.jpg',
 'ja', 'JP', 50000000, 294000000),

('Coco', 'Coco', 2017, '2017-11-22', 105, 'PG',
 9.1, 8.4, 520000, 'Aspirante a músico Miguel, que debe lidiar con una antigua maldición familiar, entra en la Tierra de los Muertos para encontrar a su tatarabuelo, un legendario cantante.',
 'https://i5.walmartimages.com/asr/591da8ad-5d7d-4839-924e-156c147701b4.5d243bebf10c969b420a3303a6c989ed.jpeg',
 'https://lumiere-a.akamaihd.net/v1/images/p_coco_19736_fd5fa537.jpeg',
 'es', 'US', 175000000, 807000000),

('Parasite', 'Parasite', 2019, '2019-05-30', 132, 'R',
 9.2, 8.5, 850000, 'Toda la familia de Ki-taek está desempleada, buscando cualquier oportunidad para ganar dinero. Finalmente, Ki-woo consigue un trabajo privado bien pagado para una familia adinerada.',
 'https://image.tmdb.org/t/p/original/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
 'https://assets.mubicdn.net/images/notebook/post_images/29836/images-w1400.jpg?1579571205',
 'ko', 'KR', 11400000, 258000000)
ON CONFLICT DO NOTHING;

-- Relación Película-Género
WITH ids AS (
  SELECT id, titulo FROM peliculas WHERE titulo IN
  ('Avengers: Endgame', 'Spider-Man: No Way Home', 'Interstellar', 'Inception',
   'La La Land', 'Yo antes de ti', 'La razón de estar contigo', 'Intensamente',
   'La Llorona', 'Ixcanul', 'Nuestras Madres', 'El Regreso de Lencho',
   'El Niño y la Garza', 'Coco', 'Parasite')
)
INSERT INTO pelicula_genero (pelicula_id, genero_id)
SELECT p.id, g.id FROM ids p
JOIN generos g ON (
  (p.titulo='Avengers: Endgame'     AND g.nombre IN ('Acción','Aventura','Ciencia ficción')) OR
  (p.titulo='Spider-Man: No Way Home' AND g.nombre IN ('Acción','Aventura','Ciencia ficción')) OR
  (p.titulo='Interstellar'          AND g.nombre IN ('Ciencia ficción','Drama','Aventura')) OR
  (p.titulo='Inception'             AND g.nombre IN ('Acción','Ciencia ficción','Thriller')) OR
  (p.titulo='La La Land'            AND g.nombre IN ('Drama','Romance','Musical')) OR
  (p.titulo='Yo antes de ti'        AND g.nombre IN ('Drama','Romance')) OR
  (p.titulo='La razón de estar contigo' AND g.nombre IN ('Drama','Comedia','Aventura')) OR
  (p.titulo='Intensamente'          AND g.nombre IN ('Animación','Aventura','Comedia','Drama')) OR
  (p.titulo='La Llorona'            AND g.nombre IN ('Drama','Terror','Thriller')) OR
  (p.titulo='Ixcanul'               AND g.nombre IN ('Drama')) OR
  (p.titulo='Nuestras Madres'       AND g.nombre IN ('Drama')) OR
  (p.titulo='El Regreso de Lencho'  AND g.nombre IN ('Drama','Romance','Comedia')) OR
  (p.titulo='El Niño y la Garza'    AND g.nombre IN ('Animación','Aventura','Fantasía','Drama')) OR
  (p.titulo='Coco'                  AND g.nombre IN ('Animación','Aventura','Comedia','Fantasía')) OR
  (p.titulo='Parasite'              AND g.nombre IN ('Drama','Thriller','Comedia'))
)
ON CONFLICT DO NOTHING;

-- Documentos largos (reseñas/críticas detalladas)
INSERT INTO documentos (pelicula_id, titulo, contenido) VALUES
((SELECT id FROM peliculas WHERE titulo='Interstellar'), 
 'Análisis Crítico', 
 'Christopher Nolan entrega una obra maestra de ciencia ficción que explora temas profundos sobre el amor, el tiempo y la supervivencia humana. La película combina efectos visuales impresionantes con una narrativa emocionalmente resonante. La representación científica de los agujeros negros y la relatividad del tiempo fue asesorada por el físico Kip Thorne, ganando elogios de la comunidad científica. Hans Zimmer compuso una banda sonora icónica que amplifica la experiencia emocional.'),

((SELECT id FROM peliculas WHERE titulo='La Llorona'), 
 'Perspectiva Histórica', 
 'Jayro Bustamante crea una poderosa alegoría sobre la justicia transicional en Guatemala. La película utiliza el folklore de La Llorona para examinar las consecuencias del genocidio maya durante la guerra civil. Es una obra audaz que mezcla el horror psicológico con la crítica social, destacándose en festivales internacionales como Venice Film Festival.'),

((SELECT id FROM peliculas WHERE titulo='Ixcanul'), 
 'Contexto Cultural', 
 'Primera película guatemalteca nominada al Oscar, Ixcanul es un retrato íntimo de la vida indígena en Guatemala. Jayro Bustamante trabajó exclusivamente con actores no profesionales de comunidades kaqchikel, filmando en su lengua nativa. La película aborda temas de tradición, modernidad, y las limitadas oportunidades para las comunidades rurales indígenas.'),

((SELECT id FROM peliculas WHERE titulo='Coco'), 
 'Impacto Cultural', 
 'Pixar logra una celebración visualmente deslumbrante de la cultura mexicana y el Día de Muertos. La película fue alabada por su representación respetuosa y auténtica de las tradiciones mexicanas, trabajando estrechamente con consultores culturales. La canción "Remember Me" ganó el Oscar a Mejor Canción Original. Es una reflexión conmovedora sobre la familia, la memoria y el legado.'),

((SELECT id FROM peliculas WHERE titulo='Parasite'), 
 'Fenómeno Internacional', 
 'Bong Joon-ho hace historia como la primera película en idioma no inglés en ganar Mejor Película en los Oscars. Parasite es una sátira brillante sobre la desigualdad de clases que funciona simultáneamente como thriller, comedia negra y drama social. Su arquitectura visual y simbolismo meticuloso han sido objeto de análisis extenso. La película rompió barreras para el cine internacional en Hollywood.')
ON CONFLICT DO NOTHING;