import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import pinia from "./store";
import { ElLoading } from "element-plus";
import "./style.css";

const app = createApp(App);

app.use(router);
app.use(pinia);
app.use(ElLoading);

app.mount("#app");
