'use strict';
window.mountOfferCommunity = function mountOfferCommunity(root, offer) {
    const api = 'https://painel.despencou.com/offer-community.php';
    const url = action => api + '?' + new URLSearchParams({offer, action});
    const node = (tag, text) => {
        const item = document.createElement(tag);
        if (text) item.textContent = text;
        return item;
    };
    const section = node('section');
    section.id = 'comentarios';
    section.className = 'offer-detail-card offer-community';
    const heading = node('h2', 'Comentários');
    const heart = node('button', '♡ Curtir');
    heart.type = 'button';
    heart.disabled = true;
    heart.setAttribute('aria-pressed', 'false');
    const status = node('p', 'Carregando comentários…');
    status.setAttribute('role', 'status');
    const account = node('div');
    const list = node('div');
    section.append(heading, heart, status, account, list);
    root.append(section);
    if (location.hash === "#comentarios") section.scrollIntoView({block: "start"});
    let liked = false;

    async function request(action, body) {
        const options = {credentials: 'include', signal: AbortSignal.timeout(10000)};
        if (body !== undefined) {
            options.method = 'POST';
            options.headers = {'Content-Type': 'application/json'};
            options.body = JSON.stringify(body);
        }
        const response = await fetch(url(action), options);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
    }

    function renderHeart(data) {
        liked = data.liked;
        heart.textContent = (liked ? '♥ Curtido' : '♡ Curtir') + ' · ' + data.hearts;
        heart.setAttribute('aria-pressed', String(liked));
    }

    function render(data) {
        renderHeart(data);
        heart.disabled = false;
        status.textContent = '';
        list.replaceChildren();
        if (!data.comments.length) list.append(node('p', 'Ainda não há comentários publicados.'));
        for (const comment of data.comments) {
            const article = node('article');
            article.append(node('strong', comment.name), node('p', comment.body));
            list.append(article);
        }
        account.replaceChildren();
        if (!data.name) {
            if (data.googleReady) {
                const login = node('a', 'Entrar com Google para comentar');
                login.href = url('login');
                account.append(login, node('p', 'Seu nome acompanha o comentário publicado. Seu e-mail fica visível apenas para a moderação.'));
            } else {
                account.append(node('p', 'Comentários em breve.'));
            }
            return;
        }

        const form = node('form');
        const label = node('label', 'Seu comentário');
        const message = node('textarea');
        message.id = 'offer-comment-text';
        message.required = true;
        message.maxLength = 400;
        label.htmlFor = message.id;
        const send = node('button', 'Enviar comentário');
        send.type = 'submit';
        const logout = node('button', 'Sair');
        logout.type = 'button';
        form.append(label, message, send, logout);
        account.append(node('p', 'Comentando como ' + data.name), form);
        form.addEventListener('submit', async event => {
            event.preventDefault();
            send.disabled = true;
            try {
                await request('comment', {body: message.value});
                message.value = '';
                status.textContent = 'Comentário enviado para aprovação.';
            } catch (error) {
                status.textContent = error.message || 'Não foi possível enviar o comentário.';
            } finally {
                send.disabled = false;
            }
        });
        logout.addEventListener('click', async () => {
            logout.disabled = true;
            try {
                await request('logout', {});
                render(await request('read'));
            } catch {
                status.textContent = 'Não foi possível sair. Tente novamente.';
                logout.disabled = false;
            }
        });
    }

    heart.addEventListener('click', async () => {
        heart.disabled = true;
        try {
            renderHeart(await request('heart', {liked: !liked}));
            status.textContent = '';
        } catch {
            status.textContent = 'Não foi possível registrar a curtida. Tente novamente.';
        } finally {
            heart.disabled = false;
        }
    });
    request('read').then(render).catch(() => {
        status.textContent = 'Comentários e curtidas indisponíveis no momento.';
    });
};
