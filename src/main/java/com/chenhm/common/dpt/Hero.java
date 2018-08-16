package com.chenhm.common.dpt;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.script.ScriptException;
import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Created by ehongmi on 5/4/2016.
 */
public class Hero {
    private static Logger log = LoggerFactory.getLogger(Hero.class);

    public static Hero New() {
        return new Hero();
    }

    private Hero() {
    }

    private String uid = UUID.randomUUID().toString();
    private DataSource dataSource;
    private Map<String, Object> env = new HashMap(System.getenv());
    private ScriptEngine scriptEngine;

    public Hero setDatafilePath(String path) {
        env.put("datafile.path", path);
        return this;
    }

    public Hero setEnv(String key, String value) {
        env.put(key, value);
        return this;
    }

    public Hero setDataSource(DataSource dataSource) {
        this.dataSource = dataSource;
        return this;
    }

    public synchronized void run(String... dataFile) throws ScriptException {
        if (scriptEngine == null) {
            scriptEngine = ScriptTools.getEngine(uid, scriptEngine -> {
                if (dataSource != null) {
                    env.put("jdbcTemplate", new JdbcTemplate(dataSource));
                }
                scriptEngine.put("env", env);
            });
        }
        try {
            ((Invocable) scriptEngine).invokeFunction("processTestcase", dataFile);
        } catch (NoSuchMethodException e) {
            log.error(e.getMessage(), e);
        }
    }
}
