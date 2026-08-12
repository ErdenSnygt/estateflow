-- =============================================================================
-- EstateFlow — RLS politikalarının performans düzeltmesi
-- =============================================================================
-- SEMANTİK DEĞİŞİKLİK YOK. Kimin neyi gördüğü birebir aynı; değişen tek şey
-- politikaların KAÇ KEZ değerlendirildiği.
--
-- -----------------------------------------------------------------------------
-- SORUN
-- -----------------------------------------------------------------------------
-- 0002'deki politikalar şu biçimdeydi:
--
--   using (public.is_manager() or agent_id = public.current_agent_id())
--
-- Postgres bu ifadeyi HER SATIR İÇİN yeniden çalıştırıyor. Fonksiyonlar
-- `stable` işaretli olsa bile planlayıcı onları satır bazlı bir filtre olarak
-- ele alıyor ve her çağrı `agents` tablosuna bir alt sorgu demek. 46 ilanlık
-- bir listede 46 kez, 64 müşteride 64 kez.
--
-- -----------------------------------------------------------------------------
-- ÇÖZÜM
-- -----------------------------------------------------------------------------
-- Fonksiyon çağrısını `(select …)` içine almak. Bu, Postgres'in ifadeyi bir
-- InitPlan olarak görmesini sağlıyor: sorgunun BAŞINDA bir kez hesaplanıyor,
-- sonuç sabit gibi kullanılıyor. Supabase'in kendi RLS performans rehberinde
-- önerilen kalıp budur.
--
--   using ((select public.is_manager()) or agent_id = (select public.current_agent_id()))
--
-- `owns_listing(id)` / `owns_customer(id)` sarmalanmıyor ve sarmalanmamalı:
-- onlar satırın KENDİ kimliğini argüman alıyor, yani gerçekten satır başına
-- değerlendirilmeleri gerekiyor. Sabit olan yalnızca "ben kimim" sorusu.
--
-- Ölçüm notu: tek bir sorgunun toplam süresi ~110-180 ms ve bunun ~42 ms'i saf
-- ağ turu. Geri kalan, sunucu tarafındaki iş — RLS değerlendirmesi de burada.
--
-- Çalıştırma: Supabase Dashboard > SQL Editor. Tekrar çalıştırılabilir.
-- =============================================================================

-- --- agents ------------------------------------------------------------------
drop policy if exists agents_read on public.agents;
create policy agents_read on public.agents
  for select to authenticated
  using ((select public.is_manager()) or id = (select public.current_agent_id()));

drop policy if exists agents_write on public.agents;
create policy agents_write on public.agents
  for all to authenticated
  using ((select public.is_manager()))
  with check ((select public.is_manager()));

-- --- listings ----------------------------------------------------------------
drop policy if exists listings_scoped on public.listings;
create policy listings_scoped on public.listings
  for all to authenticated
  using (
    (select public.is_manager())
    or agent_id = (select public.current_agent_id())
  )
  with check (
    (select public.is_manager())
    or agent_id = (select public.current_agent_id())
  );

-- --- customers ---------------------------------------------------------------
drop policy if exists customers_scoped on public.customers;
create policy customers_scoped on public.customers
  for all to authenticated
  using (
    (select public.is_manager())
    or assigned_agent_id = (select public.current_agent_id())
  )
  with check (
    (select public.is_manager())
    or assigned_agent_id = (select public.current_agent_id())
  );

-- --- customer_listing_interests ----------------------------------------------
-- `owns_customer` / `owns_listing` satırın kendi kimliğini alıyor; sarmalanmaz.
drop policy if exists interests_scoped on public.customer_listing_interests;
create policy interests_scoped on public.customer_listing_interests
  for all to authenticated
  using (
    (select public.is_manager())
    or public.owns_customer(customer_id)
    or public.owns_listing(listing_id)
  )
  with check (
    (select public.is_manager())
    or public.owns_customer(customer_id)
    or public.owns_listing(listing_id)
  );

-- --- customer_timeline_events ------------------------------------------------
drop policy if exists timeline_scoped on public.customer_timeline_events;
create policy timeline_scoped on public.customer_timeline_events
  for all to authenticated
  using ((select public.is_manager()) or public.owns_customer(customer_id))
  with check ((select public.is_manager()) or public.owns_customer(customer_id));

-- --- activity_log ------------------------------------------------------------
drop policy if exists activity_scoped on public.activity_log;
create policy activity_scoped on public.activity_log
  for all to authenticated
  using (
    (select public.is_manager())
    or actor_agent_id = (select public.current_agent_id())
    or (related_listing_id  is not null and public.owns_listing(related_listing_id))
    or (related_customer_id is not null and public.owns_customer(related_customer_id))
  )
  with check (
    (select public.is_manager())
    or actor_agent_id = (select public.current_agent_id())
  );

-- --- sales -------------------------------------------------------------------
drop policy if exists sales_scoped on public.sales;
create policy sales_scoped on public.sales
  for all to authenticated
  using (
    (select public.is_manager())
    or agent_id = (select public.current_agent_id())
  )
  with check (
    (select public.is_manager())
    or agent_id = (select public.current_agent_id())
  );

-- --- offers ------------------------------------------------------------------
drop policy if exists offers_scoped on public.offers;
create policy offers_scoped on public.offers
  for all to authenticated
  using (
    (select public.is_manager())
    or agent_id = (select public.current_agent_id())
  )
  with check (
    (select public.is_manager())
    or agent_id = (select public.current_agent_id())
  );

-- =============================================================================
-- Ek indeksler
-- =============================================================================
-- Politikalar bu kolonlar üzerinden filtreliyor; `listings.agent_id` ve
-- `customers.assigned_agent_id` 0001'de zaten indekslenmişti, eksik olanlar:
create index if not exists offers_agent_idx on public.offers (agent_id);
-- `sales_agent_idx` 0001'de var.

-- Teklif listesinin varsayılan sıralaması ve ilan detayındaki teklif sorgusu.
create index if not exists offers_customer_idx on public.offers (customer_id);
