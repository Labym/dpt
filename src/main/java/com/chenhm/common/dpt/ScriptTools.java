package com.chenhm.common.dpt;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

import javax.script.Compilable;
import javax.script.CompiledScript;
import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineFactory;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.StreamUtils;

/**
 * Created by ehongmi on 3/30/2016.
 */
public class ScriptTools {
    private static Logger log = LoggerFactory.getLogger(ScriptTools.class);

    private static final Map<String, ScriptEngine> cache = new ConcurrentHashMap<>();

    private static final String DEFAULT_ENGINE_NAME = "DEFAULT_ENGINE_NAME";

    public static ScriptEngine getEngine() {
        return getEngine(DEFAULT_ENGINE_NAME, scriptEngine -> {
        });
    }

    /**
     * all engineName create by UUID, so we not need synchronized this method.
     *
     * @param engineName
     * @return
     */
    public static ScriptEngine getEngine(String engineName, Consumer<ScriptEngine> before) {
        ScriptEngine js = cache.get(engineName);
        if (js == null) {
            ScriptEngineManager manager = new ScriptEngineManager();
            ScriptEngine engine = manager.getEngineByName("javascript");
//            ScriptEngine engine = new NashornScriptEngineFactory().getScriptEngine(new String[] { "--language=es6" });
            ScriptEngineFactory factory = engine.getFactory();
            System.out.printf("%s,%s,%s,%s\n", factory.getEngineName(), factory.getEngineVersion(), factory.getLanguageName(), factory.getLanguageVersion());
            before.accept(engine);
            InputStream in = ScriptTools.class.getResourceAsStream("/scripts/core.js");
            try {
                CompiledScript cjs = ((Compilable) engine).compile(new InputStreamReader(in));
                cjs.eval();
                js = cjs.getEngine();
                cache.put(engineName, js);
            } catch (ScriptException e) {
                log.error(e.getMessage(), e);
            }
        }
        return js;
    }

    public static String loadJS(String path, String name) throws IOException {
        if (path.startsWith("classpath:")) {
            InputStream fileis = java.io.File.class.getResourceAsStream(path.substring("classpath:".length()) + name + ".json");
            if (fileis == null) {
                log.error("file not found: " + path + name + ".json");
                return null;
            }
            return StreamUtils.copyToString(fileis, Charset.defaultCharset());
        } else {
            return StreamUtils.copyToString(new FileInputStream(path + name + ".json"), Charset.defaultCharset());
        }
    }

    public static void invokeTestcase(String testCaseName) throws ScriptException {
        try {
            ((Invocable) getEngine()).invokeFunction("processTestcase", testCaseName);
        } catch (NoSuchMethodException e) {
            log.error(e.getMessage(), e);
        }
    }
}
