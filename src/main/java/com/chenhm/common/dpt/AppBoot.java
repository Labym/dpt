package com.chenhm.common.dpt;

import com.beust.jcommander.JCommander;
import com.beust.jcommander.Parameter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import javax.sql.DataSource;
import java.util.ArrayList;
import java.util.List;

@SpringBootApplication
public class AppBoot {

    static class JCommanderOptions{
        @Parameter(names = "--help", help = true, description = "Hero is a data generation tool for iam 2.0.")
        private boolean help;

        @Parameter(names = "--claen", help = true, description = "claen data")
        private boolean claen = false;

        @Parameter(description = "<test_case.json>")
        private List<String> files = new ArrayList<>();
    }

    public static void main(String[] args){
        JCommander jc = new JCommander();
        System.out.println(AppBoot.class.getProtectionDomain().getCodeSource().getLocation());
        String jarName = new java.io.File(AppBoot.class.getProtectionDomain().getCodeSource().getLocation().getPath()).getName();
        jc.setProgramName("java -jar " + jarName);
        JCommanderOptions options = new JCommanderOptions();
        try{
            jc.addObject(options);
            jc.parse(args);
        }catch (Exception e){
//            e.printStackTrace();
            System.out.println(e.getMessage());
        }

        if(options.help){
            jc.usage();
            return;
        }

        if(options.files.size() < 1){
            jc.usage();
            return;
        }
        SpringApplication.run(AppBoot.class, args);
    }

    @Value("${datafile.path}")
    String jsonPath;

    @Bean
    public ApplicationRunner test(final DataSource dataSource) {
        return args -> {
            Hero.New().setDataSource(dataSource).setDatafilePath(jsonPath).run(args.getSourceArgs());
        };
    }
}
