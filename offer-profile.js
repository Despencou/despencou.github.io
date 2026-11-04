'use strict';
(() => {
    const header = document.querySelector('.top');
    if (!header) return;
    const endpoint = 'https://painel.despencou.com/offer-community.php';
    const page = document.querySelector('#my-profile');
    const node = (tag, text, className) => {
        const item = document.createElement(tag);
        if (text) item.textContent = text;
        if (className) item.className = className;
        return item;
    };
    const date = new Intl.DateTimeFormat('pt-BR', {day:'numeric',month:'short',timeZone:'America/Sao_Paulo'});
    const month = new Intl.DateTimeFormat('pt-BR', {month:'long',year:'numeric',timeZone:'America/Sao_Paulo'});
    const avatar = picture => {
        const circle = node('span', '', 'profile-avatar');
        circle.setAttribute('aria-hidden', 'true');
        if (picture) {
            const img = node('img');
            img.src = picture;
            img.alt = '';
            img.referrerPolicy = 'no-referrer';
            circle.append(img);
        } else {
            circle.textContent = '👤';
        }
        return circle;
    };
    const group = node('div', '', 'offer-account-controls');
    const profile = node('details', '', 'offer-profile');
    const button = node('summary');
    const menu = node('div', '', 'offer-profile-menu');
    menu.setAttribute('aria-live', 'polite');
    profile.append(button, menu);
    const bell = node('details', '', 'offer-profile profile-notifications');
    bell.hidden = true;
    const bellButton = node('summary');
    const bellIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    bellIcon.setAttribute('viewBox', '0 0 24 24');
    bellIcon.setAttribute('class', 'profile-bell-icon');
    bellIcon.setAttribute('aria-hidden', 'true');
    const bellPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    bellPath.setAttribute('d', 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4');
    bellIcon.append(bellPath);
    bellButton.append(bellIcon);
    bellButton.setAttribute('aria-label', 'Notificações');
    const badge = node('span', '', 'profile-badge');
    badge.hidden = true;
    bellButton.append(badge);
    const notifications = node('div', '', 'offer-profile-menu');
    bell.append(bellButton, notifications);
    group.append(bell, profile);
    header.append(group);
    let session = {};
    let sessionVersion = 0;
    let markingNotifications = false;

    async function request(action, body) {
        const options = {credentials:'include', signal:AbortSignal.timeout(10000)};
        if (body !== undefined) {
            options.method = 'POST';
            options.headers = {'Content-Type':'application/json'};
            options.body = JSON.stringify(body);
        }
        const response = await fetch(endpoint + '?action=' + action, options);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    }

    function loginLink() {
        const login = node('a', 'Entrar com Google');
        const search = /^\?id=tg-[0-9]+$/.test(location.search) ? location.search : '';
        const hash = /^#(?:ofertas|cupons|blog|comentarios|comentario-[0-9]+)$/.test(location.hash) ? location.hash : '';
        login.href = endpoint + '?' + new URLSearchParams({action:'login',return_to:location.pathname+search+hash});
        return login;
    }

    function showUnread(count) {
        badge.hidden = !count;
        badge.textContent = count > 99 ? '99+' : String(count || '');
        bellButton.setAttribute('aria-label', count ? 'Notificações (' + count + ' novas)' : 'Notificações');
    }

    function renderSession(next) {
        session = next;
        const name = session.name?.trim().split(/\s+/)[0] || 'Perfil';
        button.replaceChildren(avatar(session.picture), node('span', name, 'profile-label'));
        button.setAttribute('aria-label', session.name ? 'Perfil de ' + session.name : 'Perfil');
        bell.hidden = !session.name;
        showUnread(bell.open || markingNotifications ? 0 : session.unread);
        menu.replaceChildren();
        if (session.name) {
            const mine = node('a', 'Meu perfil');
            mine.href = '/perfil/';
            const logout = node('button', 'Sair');
            logout.type = 'button';
            logout.addEventListener('click', async () => {
                logout.disabled = true;
                try {
                    await request('logout', {});
                    sessionVersion++;
                    bell.open = false;
                    renderSession({googleReady:session.googleReady});
                    if (page) page.replaceChildren(loginLink());
                    window.dispatchEvent(new Event('despencou-session-change'));
                } catch {
                    logout.textContent = 'Tentar sair novamente';
                    logout.disabled = false;
                }
            });
            menu.append(node('strong', session.name), mine, logout);
        } else if (session.googleReady) {
            menu.append(loginLink());
        } else {
            menu.textContent = 'Login indisponível no momento.';
        }
    }

    async function loadSession() {
        const version = ++sessionVersion;
        const next = await request('session');
        if (version === sessionVersion) renderSession(next);
    }

    bell.addEventListener('toggle', async () => {
        if (!bell.open) return;
        profile.open = false;
        markingNotifications = true;
        showUnread(0);
        notifications.textContent = 'Carregando notificações…';
        try {
            const result = await request('notifications');
            notifications.replaceChildren(node('strong', 'Notificações'));
            if (!result.notifications.length) notifications.append(node('p', 'Nenhuma notificação por enquanto.'));
            for (const item of result.notifications) {
                const isHeart = item.kind === 'heart';
                const message = isHeart ? ' curtiu seu comentário em ' : ' respondeu ao seu comentário em ';
                const link = node('a', item.name + message + item.title);
                link.href = '/oferta/' + item.offer + '/#comentario-' + (item.comment_id || item.id);
                if (item.id > (isHeart ? result.seenHeart : result.seen)) link.className = 'unread-reply';
                notifications.append(link);
            }
            await request('notifications-read', {all:true});
            sessionVersion++;
            session.unread = 0;
        } catch {
            notifications.textContent = 'Não foi possível carregar as notificações.';
        } finally {
            markingNotifications = false;
            if (!bell.open) showUnread(session.unread);
        }
    });

    profile.addEventListener('toggle', () => {
        if (!profile.open) return;
        bell.open = false;
        loadSession().catch(() => {});
    });
    document.addEventListener('pointerdown', event => {
        if (!group.contains(event.target)) {
            profile.open = false;
            bell.open = false;
        }
    });
    group.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        const open = [profile,bell].find(item => item.open);
        if (!open) return;
        open.open = false;
        open.querySelector('summary').focus();
    });

    async function renderProfile() {
        if (!session.name) {
            page.replaceChildren(node('p', 'Entre para ver seu perfil e suas atividades.'), loginLink());
            return;
        }
        const data = await request('profile');
        if (!session.name) return;
        const identity = node('section', '', 'profile-identity');
        const picture = avatar(data.picture);
        const toggle = node('input');
        toggle.type = 'checkbox';
        toggle.checked = data.showPicture;
        toggle.disabled = !data.hasPicture;
        const photoLabel = node('label', '', 'profile-photo-option');
        photoLabel.append(toggle, node('span', 'Mostrar minha foto do Google no perfil e nos comentários'));
        const photoStatus = node('p', data.hasPicture ? '' : 'Para carregar sua foto, saia e entre novamente com Google.', 'profile-note');
        photoStatus.setAttribute('role', 'status');
        toggle.addEventListener('change', async () => {
            const enabled = toggle.checked;
            toggle.disabled = true;
            try {
                const saved = await request('photo', {enabled});
                picture.replaceChildren(...avatar(saved.picture).childNodes);
                renderSession({...session,picture:saved.picture});
                photoStatus.textContent = 'Preferência salva.';
            } catch (error) {
                toggle.checked = !enabled;
                photoStatus.textContent = error.message || 'Não foi possível salvar.';
            } finally {
                toggle.disabled = false;
            }
        });
        const removeAccount = node('button', 'Excluir minha conta', 'profile-delete-account');
        removeAccount.type = 'button';
        const deletionStatus = node('p', '', 'profile-note');
        deletionStatus.setAttribute('role', 'status');
        removeAccount.addEventListener('click', async () => {
            if (!window.confirm('Excluir sua conta do Despencou? Seu perfil, comentários e curtidas vinculadas serão apagados. Esta ação é definitiva.')) return;
            removeAccount.disabled = true;
            try {
                await request('delete-account', {confirm:true});
                sessionVersion++;
                bell.open = false;
                renderSession({googleReady:session.googleReady});
                window.dispatchEvent(new Event('despencou-session-change'));
                page.replaceChildren(node('p', 'Sua conta do Despencou foi excluída.'));
            } catch (error) {
                deletionStatus.textContent = error.message || 'Não foi possível excluir sua conta.';
                removeAccount.disabled = false;
            }
        });
        identity.append(picture, node('h2', data.name), node('p', 'Membro desde ' + month.format(data.joined*1000), 'member-badge'), photoLabel, photoStatus);
        identity.append(removeAccount, deletionStatus);
        const activity = node('section', '', 'profile-activities');
        activity.append(node('h2', 'Atividades'));
        const list = node('ol');
        for (const item of data.activities) {
            const row = node('li');
            const label = item.kind === 'heart' ? '♥ Curtiu uma oferta' : '💬 Comentou em uma oferta';
            const link = node('a', item.title);
            link.href = '/oferta/' + item.offer + '/' + (item.id ? '#comentario-' + item.id : '');
            row.append(node('strong', label), node('time', date.format(item.created*1000)), link);
            if (item.body) row.append(node('p', item.body));
            list.append(row);
        }
        const welcome = node('li');
        welcome.append(node('strong', 'Bem-vindo ao Despencou!'), node('time', date.format(data.joined*1000)), node('p', 'Você entrou para a comunidade.'));
        list.append(welcome);
        activity.append(list);
        page.replaceChildren(identity, activity);
    }

    renderSession({googleReady:true});
    loadSession().then(() => page && renderProfile()).catch(() => {
        menu.textContent = 'Não foi possível carregar o perfil.';
        if (page) page.textContent = 'Não foi possível carregar o perfil. Atualize a página para tentar novamente.';
    });
    setInterval(() => {
        if (session.name && !document.hidden) loadSession().catch(() => {});
    }, 60000);
})();
