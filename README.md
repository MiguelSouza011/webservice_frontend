
# 🛒 CommerceHub

### Dashboard Administrativo | Full Stack

O **CommerceHub** é uma aplicação web de gerenciamento comercial, desenvolvida para oferecer uma interface moderna, intuitiva e responsiva para administração de usuários, produtos, pedidos e categorias.

O projeto utiliza **HTML5, CSS3 e JavaScript** no frontend, consumindo uma **API REST desenvolvida com Java e Spring Boot**.

A aplicação conta com um dashboard que apresenta indicadores de desempenho, gráficos e informações consolidadas, permitindo acompanhar os principais dados do sistema de maneira centralizada.

---

## 📊 Dashboard

A página inicial apresenta uma visão geral das informações do sistema, utilizando dados obtidos diretamente da API REST.

**Principais indicadores:**
- Total de pedidos registrados
- Valor total dos pedidos
- Quantidade de produtos cadastrados
- Total de usuários
- Quantidade de categorias
- Gráfico de pedidos dos últimos seis meses
- Distribuição dos pedidos por status
- Listagem dos pedidos mais recentes

Os indicadores são calculados dinamicamente a partir dos dados retornados pelo backend.

---

## 🚀 Funcionalidades

### 👥 Gerenciamento de Usuários

- Listagem de usuários cadastrados
- Pesquisa de usuários
- Visualização de informações individuais
- Cadastro de novos usuários
- Edição de informações
- Exclusão de usuários
- Integração com endpoints REST

### 📦 Gerenciamento de Produtos

- Visualização do catálogo
- Pesquisa por nome, descrição ou identificador
- Exibição de preços e imagens
- Consulta detalhada de produtos
- Interface para cadastro, edição e exclusão
- Indicadores de produtos cadastrados

As operações de escrita dependem da disponibilidade dos respectivos endpoints no backend.

### 🛍️ Gerenciamento de Pedidos

- Listagem de pedidos
- Consulta de pedidos por identificador
- Visualização dos clientes
- Acompanhamento dos status
- Exibição de itens e valores
- Consulta de informações de pagamento
- Organização dos pedidos por data

### 🏷️ Gerenciamento de Categorias

- Listagem de categorias
- Pesquisa por nome ou identificador
- Visualização de detalhes
- Consulta de produtos associados
- Indicadores de categorias cadastradas

---

## 🛠️ Tecnologias Utilizadas

### Frontend

- **HTML5:** estrutura semântica das páginas
- **CSS3:** estilização, responsividade, Flexbox e Grid Layout
- **JavaScript:** manipulação do DOM, eventos e lógica da interface
- **Fetch API:** comunicação HTTP com o backend
- **Inter:** tipografia da aplicação

### Backend

- **Java**
- **Spring Boot**
- **Spring Web**
- **Spring Data JPA**
- **Hibernate**
- **API REST**
- **Maven**

---

## 🏗️ Arquitetura

A aplicação utiliza uma arquitetura cliente-servidor, separando a interface visual das regras de negócio.

```text
       COMMERCEHUB
          |
          v
  Frontend Web
  HTML + CSS + JavaScript
          |
          | HTTP / JSON
          v
  API REST - Spring Boot
          |
          v
  Controllers / Services
          |
          v
  Spring Data JPA
          |
          v
     Banco de Dados
```

O frontend realiza requisições HTTP para obter e apresentar informações do backend.

A API REST é responsável pelo processamento das requisições, execução das regras de negócio e acesso aos dados.

---

## 📁 Estrutura do Frontend

```text
commercehub-frontend/
│
├── index.html
│
├── pages/
│   ├── users.html
│   ├── products.html
│   ├── orders.html
│   └── categories.html
│
├── css/
│   ├── style.css
│   ├── dashboard.css
│   ├── users.css
│   ├── products.css
│   ├── orders.css
│   └── categories.css
│
└── js/
    ├── main.js
    ├── dashboard.js
    ├── users.js
    ├── products.js
    ├── orders.js
    └── categories.js
```

---

## 🔗 Integração com a API REST

A comunicação entre frontend e backend é realizada por meio da Fetch API, utilizando requisições HTTP e respostas JSON.

### Endpoints de Consulta

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/users` | Lista usuários |
| GET | `/users/{id}` | Consulta um usuário |
| GET | `/products` | Lista produtos |
| GET | `/products/{id}` | Consulta um produto |
| GET | `/orders` | Lista pedidos |
| GET | `/orders/{id}` | Consulta um pedido |
| GET | `/categories` | Lista categorias |
| GET | `/categories/{id}` | Consulta uma categoria |

### Operações de Gerenciamento

A interface também contempla operações de cadastro, atualização e exclusão de recursos, conforme os endpoints implementados no backend.

A comunicação segue os princípios REST, utilizando métodos HTTP como GET, POST, PUT e DELETE.

---

## 💻 Executando o Projeto

### Pré-requisitos

- Java e Maven configurados
- Backend Spring Boot em execução
- Navegador atualizado
- Visual Studio Code com Live Server ou outro servidor HTTP local

### 1. Iniciar o Backend

Execute a aplicação Spring Boot utilizando sua IDE ou o Maven.

```bash
mvn spring-boot:run
```

Por padrão, o frontend está configurado para acessar:

```text
http://localhost:8080
```

### 2. Executar o Frontend

Abra a pasta `commercehub-frontend` no Visual Studio Code.

Inicie o arquivo `index.html` utilizando o Live Server.

Exemplo de endereço:

```text
http://127.0.0.1:5500
```

### 3. Configurar CORS

O backend deve permitir requisições originadas do endereço utilizado pelo frontend.

Exemplo de configuração em um controller:

```java
@CrossOrigin(origins = {
    "http://localhost:5500",
    "http://127.0.0.1:5500"
})
```

---

## 🎨 Interface e Experiência do Usuário

O CommerceHub foi desenvolvido com foco em usabilidade e organização visual.

Entre os principais recursos da interface estão:

- Layout responsivo para desktop, tablet e dispositivos móveis
- Menu lateral de navegação
- Cards com indicadores
- Gráficos de acompanhamento
- Tabelas organizadas
- Campos de pesquisa
- Modais para visualização de informações
- Estados de carregamento e mensagens de erro
- Identidade visual consistente em todas as páginas

A interface utiliza uma paleta de cores baseada em tons de roxo, azul, branco e cinza, com tipografia Inter.

---

## 📚 Conceitos Aplicados

Durante o desenvolvimento, foram aplicados conceitos de:

- Desenvolvimento frontend e backend
- Arquitetura cliente-servidor
- Integração com APIs REST
- Manipulação do DOM
- JavaScript assíncrono com Async/Await
- Promises e Fetch API
- Métodos e códigos de resposta HTTP
- Serialização e desserialização JSON
- Design responsivo
- Componentização visual com CSS
- Separação de responsabilidades
- Programação orientada a objetos
- Persistência de dados com JPA/Hibernate

---

## 👨‍💻 Autor

**Miguel Souza**

Estudante de Engenharia de Software, com foco em desenvolvimento backend utilizando Java, Spring Boot, APIs REST e bancos de dados relacionais.

GitHub: [MiguelSouza011](https://github.com/MiguelSouza011)

---

## 📄 Sobre o Projeto

O CommerceHub foi desenvolvido como projeto prático de desenvolvimento Full Stack, integrando uma interface administrativa com uma API REST baseada no projeto WebServices.

Seu objetivo é demonstrar conhecimentos de desenvolvimento web, integração entre sistemas, organização de código e construção de interfaces para aplicações comerciais.
